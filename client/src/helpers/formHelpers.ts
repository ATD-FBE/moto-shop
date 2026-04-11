import { FIELD_SAVE_STATUS, FIELD_SAVE_STATUS_MESSAGES } from '@/config/constants.js';
import type {
    TFormStatus,
    TSubmitStates,
    IFormGroupConfig,
    IFieldConfig,
    IFieldState,
    TFieldsState,
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

export const createInitFieldsState = <TFieldName extends string>(
    fieldConfigs: readonly (IFieldConfig & { name: TFieldName })[],
    options: {
        extraStateFields?: Record<TFieldName, (keyof IFieldConfig)[]>,
        autoSave?: boolean,
    } = {}
): TFieldsState<TFieldName> => {
    const { extraStateFields, autoSave } = options;

    return fieldConfigs.reduce((acc, config) => {
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
    }, {} as TFieldsState<TFieldName>);
};

export const fieldsStateReducer = <TFieldName extends string>(
    state: TFieldsState<TFieldName>,
    action: TFieldsAction<TFieldName>
): TFieldsState<TFieldName> => {
    switch (action.type) {
        case 'UPDATE': {
            const newState = { ...state };

            for (const name in action.payload) {
                const fieldName = name as TFieldName;

                newState[fieldName] = { 
                    ...state[fieldName], 
                    ...action.payload[fieldName] 
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
                const fieldName = name as TFieldName;

                saveState[fieldName] = {
                    ...state[fieldName],
                    savedValue: status === FIELD_SAVE_STATUS.SUCCESS
                        ? fields[fieldName]
                        : state[fieldName].savedValue,
                    saveStatus: status,
                    saveStatusMessage: status
                        ? FIELD_SAVE_STATUS_MESSAGES[status]
                        : state[fieldName].saveStatusMessage
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

export const processFormattedFieldDeletion = (
    e: React.KeyboardEvent<HTMLInputElement>,
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
            while (charToDeleteIdx >= 0 && !charRegex.test(value[charToDeleteIdx])) {
                charToDeleteIdx--;
            }
            if (charToDeleteIdx < 0) return null;
            
            newValue = value.slice(0, charToDeleteIdx) + value.slice(charToDeleteIdx + 1);
            newCursorPos = charToDeleteIdx; // Символ перед курсором удалён
        } else if (isDelete) {
            if (selectionStart === value.length) return null;

            // Поиск и удаление ближайшего значащего символа справа от курсора
            let charToDeleteIdx = selectionStart;
            while (charToDeleteIdx < value.length && !charRegex.test(value[charToDeleteIdx])) {
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
        if (charRegex.test(rawString[i])) {
            validCharsCount++;
        }
    }

    // Основной поиск позиции по количеству значащих символов в новой строке
    let newCursorPos = 0;
    let foundChars = 0;

    while (foundChars < validCharsCount && newCursorPos < formattedString.length) {
        if (charRegex.test(formattedString[newCursorPos])) {
            foundChars++;
        }
        newCursorPos++;
    }

    // Пропуск разделителей перед следующим значащим символом
    while (newCursorPos < formattedString.length && !charRegex.test(formattedString[newCursorPos])) {
        newCursorPos++;
    }

    return newCursorPos;
};
