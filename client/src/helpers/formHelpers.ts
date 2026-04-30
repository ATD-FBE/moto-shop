import { KeyboardEvent } from 'react';
import { FIELD_SAVE_STATUS, FIELD_SAVE_STATUS_MESSAGES } from '@/config/constants.js';
import type {
    TFormStatus,
    TSubmitStates,
    IFormGroupConfig,
    TFieldValue,
    IFieldConfig,
    IFieldState,
    TFormState,
    TFieldsAction,
    IProcessFormattedFieldDeletionContext,
    IProcessFormattedFieldDeletionResult
} from '@/types/index.js';

export const getLockedStatuses = (submitStates: TSubmitStates): Set<TFormStatus> => {
    const lockedArray = (Object.entries(submitStates) as [TFormStatus, { locked: boolean }][])
        .map(([status, state]) => state.locked && status)
        .filter((status): status is TFormStatus => Boolean(status));

    return new Set(lockedArray);
};

export const extractFieldConfigs = <T extends readonly IFormGroupConfig[]>(
    formGroupConfigs: T
) => formGroupConfigs.flatMap(cfg => cfg.fieldConfigs || []) as T[number]['fieldConfigs'];

// Расширение конфигов полей, позволяет обращаться к полям, которых нет в конфигах (напр. trim)
export const extendFieldConfigs = <T extends readonly IFieldConfig[]>(
    configs: T
) => configs as { [K in keyof T]: T[K] & IFieldConfig };

export const createFieldConfigMap = <
    TFieldName extends string, 
    TFieldConfig extends IFieldConfig & { name: TFieldName }
>(
    fieldConfigs: readonly TFieldConfig[]
): Record<TFieldName, TFieldConfig> =>
    fieldConfigs.reduce((acc, config) => {
        acc[config.name] = config;
        return acc;
    }, {} as Record<TFieldName, TFieldConfig>);

export const createInitialFieldsState = <TFieldName extends string>(
    fieldConfigs: readonly (IFieldConfig & { name: TFieldName })[],
    options: {
        extraStateFields?: Partial<Record<TFieldName, (keyof IFieldConfig)[]>>,
        autoSave?: boolean,
    } = {}
): TFormState<TFieldName> => {
    const { extraStateFields, autoSave } = options;

    const state = fieldConfigs.reduce((acc, config) => {
        const { enabled, name, elem, type, defaultValue } = config;

        const state: IFieldState = {
            value: defaultValue !== undefined ? defaultValue : elem === 'checkbox' ? false : '',
            uiStatus: '',
            error: ''
        };

        if (enabled !== undefined) {
            state.enabled = enabled;
        }

        if (type === 'file') {
            state.files = [];
        }

        const fieldsToCopy = extraStateFields?.[name];

        if (fieldsToCopy) {
            fieldsToCopy.forEach(key => {
                const val = config[key];

                if (
                    val !== undefined &&
                    (typeof val === 'string' || typeof val === 'number' || typeof val === 'boolean')
                ) {
                    (state as Partial<Record<typeof key, typeof val>>)[key] = val;
                }
            });
        }

        if (autoSave) {
            state.savedValue = elem === 'checkbox' ? false : '';
            state.saveStatus = '';
            state.saveStatusMessage = '';
        }

        acc[name] = state;
        return acc;
    }, {} as TFormState<TFieldName>);

    return state;
};

export const fieldsStateReducer = <TFieldName extends string>(
    state: TFormState<TFieldName>,
    action: TFieldsAction<TFieldName>
): TFormState<TFieldName> => {
    switch (action.type) {
        case 'UPDATE': {
            const newState = { ...state };

            for (const name in action.payload) {
                newState[name] = { 
                    ...state[name], 
                    ...action.payload[name] 
                };
            }

            return newState;
        }

        case 'TOGGLE_ENABLED': {
            const name = action.payload.name;

            return {
                ...state,
                [name]: { 
                    ...state[name], 
                    enabled: !state[name].enabled 
                }
            };
        }

        case 'SAVE': {
            const { fields, status } = action.payload;
            const saveState = { ...state };

            for (const name in fields) {
                saveState[name] = {
                    ...state[name],
                    savedValue: status === FIELD_SAVE_STATUS.SUCCESS
                        ? fields[name]
                        : state[name].savedValue,
                    saveStatus: status,
                    saveStatusMessage: status
                        ? FIELD_SAVE_STATUS_MESSAGES[status]
                        : state[name].saveStatusMessage
                };
            }
            
            return saveState;
        }

        case 'RESET':
            return action.payload;

        default:
            return state;
    }
};

export const getStringValue = (val?: TFieldValue): string =>
    typeof val === 'string' ? val : String(val ?? '');

export const getBoolValue = (val?: TFieldValue, fallback = false): boolean =>
    typeof val === 'boolean' ? val : fallback;

export const createFormData = (data: any): FormData => {
    const formData = new FormData();
    if (!data || typeof data !== 'object') return formData;

    // Сбор файловых полей в fileQueue и установка в formData любых других в первую очередь
    const fileQueue: Array<{ key: string; value: File }> = [];
    
    Object.keys(data).forEach(key => {
        const value = data[key];
        if (value === undefined || value === null) return;

        if (Array.isArray(value)) {
            value.forEach(item => {
                if (item instanceof File) {
                    fileQueue.push({ key: String(key), value: item });
                } else {
                    formData.append(String(key), String(item));
                }
            });
        } else if (value instanceof File) {
            fileQueue.push({ key: String(key), value });
        } else {
            formData.append(String(key), String(value));
        }
    });

    // Установка файловых полей в конце
    fileQueue.forEach(({ key, value }) => {
        formData.append(key, value);
    });

    return formData;
};

export const processFormattedFieldDeletion = (
    e: KeyboardEvent<HTMLInputElement>,
    context: IProcessFormattedFieldDeletionContext
): IProcessFormattedFieldDeletionResult | null => {
    const { value, charRegex = /\d/, format } = context;
    if (!value) return null;

    const isBackspace = e.key === 'Backspace';
    const isDelete = e.key === 'Delete';
    if (!isBackspace && !isDelete) return null;

    const selectionStart = context.selectionStart ?? 0;
    const selectionEnd = context.selectionEnd ?? 0;
    let newValue = value;
    let newCursorPos = selectionStart; // Дефолт для диапазона и Delete

    // Если есть выделение — простое вырезание выделенного диапазона
    if (selectionStart !== selectionEnd) {
        newValue = value.slice(0, selectionStart) + value.slice(selectionEnd);
        // newCursorPos остаётся selectionStart
    } else {
        // Если выделения нет — работаем с одиночными символами
        if (isBackspace) {
            if (selectionStart === 0) return null;
            
            // Поиск и удаление ближайшего значащего символа слева от курсора
            let charToDeleteIdx = selectionStart - 1;
            while (charToDeleteIdx >= 0 && !charRegex.test(value.charAt(charToDeleteIdx))) {
                charToDeleteIdx--;
            }
            if (charToDeleteIdx < 0) return null;
            
            newValue = value.slice(0, charToDeleteIdx) + value.slice(charToDeleteIdx + 1);
            newCursorPos = charToDeleteIdx; // Символ перед курсором удалён
        } else if (isDelete) {
            if (selectionStart === value.length) return null;

            // Поиск и удаление ближайшего значащего символа справа от курсора
            let charToDeleteIdx = selectionStart;
            while (charToDeleteIdx < value.length && !charRegex.test(value.charAt(charToDeleteIdx))) {
                charToDeleteIdx++;
            }
            if (charToDeleteIdx >= value.length) return null;

            newValue = value.slice(0, charToDeleteIdx) + value.slice(charToDeleteIdx + 1);
            // newCursorPos равен selectionStart, так как слева от курсора не было изменений
        }
    }

    // Форматирование нового значения с удалённым значащим символом или диапазоном
    const formattedValue = format ? format(newValue) : newValue;

    return {
        preventDefault: true, // Браузер не изменит value инпута (onChange не сработает)
        nextValue: formattedValue,
        nextCursorPos: calcFormattedFieldCursorPos(newValue, newCursorPos, formattedValue, charRegex)
    };
};

export const calcFormattedFieldCursorPos = (
    rawString: string,
    rawCursorPos: number,
    formattedString: string,
    charRegex: RegExp
): number => {
    // Поиск значащих символов до курсора в старой строке
    let validCharsCount = 0;
    
    for (let i = 0; i < rawCursorPos; i++) {
        if (charRegex.test(rawString.charAt(i))) {
            validCharsCount++;
        }
    }

    // Основной поиск позиции по количеству значащих символов в новой строке
    let newCursorPos = 0;
    let foundChars = 0;

    while (foundChars < validCharsCount && newCursorPos < formattedString.length) {
        if (charRegex.test(formattedString.charAt(newCursorPos))) {
            foundChars++;
        }
        newCursorPos++;
    }

    // Пропуск разделителей перед следующим значащим символом
    while (
        newCursorPos < formattedString.length &&
        !charRegex.test(formattedString.charAt(newCursorPos))
    ) {
        newCursorPos++;
    }

    return newCursorPos;
};
