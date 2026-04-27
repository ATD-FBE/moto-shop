import { useMemo, useReducer, useState, useRef, useEffect, createElement } from 'react';
import { useNavigate } from 'react-router-dom';
import cn from 'classnames';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import FormFooter from '@/components/common/FormFooter.jsx';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import {
    sendPromoRequest,
    sendPromoCreateRequest,
    sendPromoUpdateRequest
} from '@/api/promoRequests.js';
import { routeConfig } from '@/config/appRouting.js';
import {
    FORM_STATUS,
    BASE_SUBMIT_STATES,
    FIELD_UI_STATUS,
    SUCCESS_DELAY
} from '@/config/constants.js';
import { setNavigationLock } from '@/redux/slices/uiSlice.js';
import {
    getLockedStatuses,
    extendFieldConfigs,
    createFieldConfigMap,
    createInitialFieldsState,
    fieldsStateReducer,
    getStringValue
} from '@/helpers/formHelpers.js';
import { toKebabCase, getFieldInfoClass } from '@/helpers/textHelpers.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import {
    validationRules,
    fieldErrorMessages,
    DEFAULT_FIELD_ERROR_MESSAGE
} from '@shared/fieldRules.js';
import { ALLOWED_IMAGE_MIME_TYPES, MAX_PROMO_IMAGE_SIZE_MB } from '@shared/constants.js';
import type {
    JSX,
    ChangeEvent,
    FocusEvent,
    SubmitEvent,
    InputHTMLAttributes,
    TextareaHTMLAttributes
} from 'react';
import type {
    IGetSubmitStatesResult,
    TFormStatus,
    TSubmitStates,
    TFieldValue,
    TFormDataFieldValue,
    IFieldState,
    IProcessFormFieldsResult
} from '@/types/index.js';
import type {
    TEntityField,
    TValidationRuleType,
    TPromoCreateBodyClient,
    TPromoUpdateBodyClient
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

// Локальная типизация конфигов полей
type TFieldConfigs = typeof fieldConfigs;
type TFieldConfig = TFieldConfigs[number];
type TFieldName = TFieldConfig['name'];

// Проверка наличия полей конфига в наборе полей сущности
type TValidFieldName = Extract<TFieldName, TEntityField<'promotion'>>;

// Вспомогательные типы
type TInitFieldValues = Record<TValidFieldName, TFieldValue>;
type TFieldsStateUpdates = Partial<Record<TValidFieldName, Partial<IFieldState>>>;

interface IPromoEditorProps {
    promoId: string | null;
}

type TPromoBody = TPromoCreateBodyClient | TPromoUpdateBodyClient;
type TPromoBodyAllKeys = keyof (TPromoCreateBodyClient & TPromoUpdateBodyClient);
type TFieldEntries = [TPromoBodyAllKeys, TFormDataFieldValue][];

interface IProcessFieldResult {
    isValid: boolean;
    fieldStateValue: {
        files?: File[];
        value?: TFieldValue;
    };
    fieldEntries: TFieldEntries;
    isValueChanged: boolean;
}

type TFormFields = {
    [K in TPromoBodyAllKeys]: TFormDataFieldValue;
};

type TFieldElemProps =
    InputHTMLAttributes<HTMLInputElement> & 
    TextareaHTMLAttributes<HTMLTextAreaElement>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const getSubmitStates = (isEditMode: boolean): IGetSubmitStatesResult => {
    const base = BASE_SUBMIT_STATES;
    const {
        DEFAULT, LOADING, LOAD_ERROR, BAD_REQUEST, NOT_FOUND,
        UNCHANGED, INVALID, ERROR, TIMEOUT, SUCCESS
    } = FORM_STATUS;
    const actionLabel = isEditMode ? 'Изменить' : 'Создать';

    const submitStates: TSubmitStates = {
        ...base,
        [DEFAULT]: { submitBtnLabel: actionLabel },
        [LOADING]: { ...base[LOADING], mainMessage: 'Загрузка акции...' },
        [LOAD_ERROR]: { ...base[LOAD_ERROR], mainMessage: 'Не удалось загрузить акцию.' },
        [BAD_REQUEST]: { ...base[BAD_REQUEST], submitBtnLabel: actionLabel },
        [NOT_FOUND]: {
            ...base[NOT_FOUND],
            mainMessage: 'Исходная акция или связанный с ней ресурс не найден.'
        },
        [UNCHANGED]: { ...base[UNCHANGED], addMessage: 'Акция не изменена.', submitBtnLabel: actionLabel },
        [INVALID]: { ...base[INVALID], submitBtnLabel: actionLabel },
        [ERROR]: { ...base[ERROR], submitBtnLabel: actionLabel },
        [TIMEOUT]: { ...base[TIMEOUT], submitBtnLabel: actionLabel },
        [SUCCESS]: {
            ...base[SUCCESS],
            mainMessage: isEditMode ? 'Акция отредактирована.' : 'Акция создана!',
            addMessage: 'Вы будете перенаправлены на страницу акций магазина.',
            submitBtnLabel: 'Перенаправление...'
        }
    } as const;

    const lockedStatuses = getLockedStatuses(submitStates);

    return { submitStates, lockedStatuses };
};

const fieldConfigs = extendFieldConfigs([
    {
        name: 'title',
        label: 'Название акции',
        elem: 'input',
        type: 'text',
        placeholder: 'Укажите название акции',
        autoComplete: 'off',
        trim: true
    },
    {
        name: 'image',
        label: 'Изображение',
        elem: 'input',
        type: 'file',
        accept: ALLOWED_IMAGE_MIME_TYPES.join(', '),
        allowedTypes: [...ALLOWED_IMAGE_MIME_TYPES],
        maxSizeMB: MAX_PROMO_IMAGE_SIZE_MB,
        optional: true
    },
    {
        name: 'description',
        label: 'Описание акции',
        elem: 'textarea',
        placeholder: 'Введите текст акции',
        autoComplete: 'off',
        trim: true
    },
    {
        name: 'startDate',
        label: 'Дата начала акции',
        elem: 'input',
        type: 'date'
    },
    {
        name: 'endDate',
        label: 'Дата окончания акции (включительно)',
        elem: 'input',
        type: 'date'
    }
] as const);

const fieldConfigMap = createFieldConfigMap<TValidFieldName, TFieldConfig>(fieldConfigs);
const initialFieldsState = createInitialFieldsState<TValidFieldName>(fieldConfigs);

export default function PromoEditor({ promoId }: IPromoEditorProps): JSX.Element {
    const isEditMode = Boolean(promoId);

    const { submitStates, lockedStatuses } = useMemo(() => getSubmitStates(isEditMode), [isEditMode]);
    
    const [fieldsState, dispatchFieldsState] = useReducer(fieldsStateReducer, initialFieldsState);
    const [submitStatus, setSubmitStatus] = useState<TFormStatus>(
        isEditMode ? FORM_STATUS.LOADING : FORM_STATUS.DEFAULT
    );
    const [shouldRemoveImage, setShouldRemoveImage] = useState(false);

    const initFieldValuesRef = useRef<TInitFieldValues>({} as TInitFieldValues);
    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const isFormLocked = lockedStatuses.has(submitStatus);

    const loadPromo = async (promoId: string): Promise<void> => {
        setSubmitStatus(FORM_STATUS.LOADING);

        const responseData = await dispatch(sendPromoRequest(promoId));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        logRequestStatus({ context: 'PROMO: LOAD SINGLE', status, message });

        if (status !== FORM_STATUS.SUCCESS) {
            const finalStatus = submitStates[status].locked ? status : FORM_STATUS.LOAD_ERROR;
            return setSubmitStatus(finalStatus);
        }

        const { title, image, description, startDate, endDate } = responseData.promo;
        const formattedStartDate = startDate.split('T')[0];
        const formattedEndDate = endDate.split('T')[0];

        initFieldValuesRef.current = {
            title,
            image: image ?? null, // URL или undefined
            description,
            startDate: formattedStartDate,
            endDate: formattedEndDate
        };

        dispatchFieldsState({
            type: 'UPDATE',
            payload: {
                title: { value: title },
                description: { value: description },
                startDate: { value: formattedStartDate },
                endDate: { value: formattedEndDate }
            }
        });
        
        setSubmitStatus(FORM_STATUS.DEFAULT);
    };

    const reloadPromo = (): void => {
        if (isEditMode && promoId) loadPromo(promoId);
    }

    const handleFieldChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const target = e.currentTarget;
        const { name, type, value } = target;
        const files = target instanceof HTMLInputElement ? Array.from(target.files || []) : [];

        const fieldsStateUpdates = {
            [name]: {
                ...(type === 'file' ? { files } : { value }),
                uiStatus: '',
                error: ''
            }
        };

        // Настройка ограничения дат
        if (type === 'date' && value) {
            const startDateVal = name === 'startDate' ? value : String(fieldsState.startDate.value);
            const endDateVal = name === 'endDate' ? value : String(fieldsState.endDate.value);

            const startDate = startDateVal ? new Date(startDateVal) : null;
            const endDate = endDateVal ? new Date(endDateVal) : null;

            if (startDate && endDate) {
                // Дата начала стала больше даты конца —> сброс начала на конец
                if (name === 'startDate' && startDate > endDate) {
                    fieldsStateUpdates.endDate = { value, uiStatus: '', error: '' };
                }

                // Дата конца стала меньше даты начала —> сброс конца на начало
                if (name === 'endDate' && endDate < startDate) {
                    fieldsStateUpdates.endDate = { value: startDateVal, uiStatus: '', error: '' };
                }
            }
        }

        dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });
    };

    const handleTrimmedFieldBlur = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const { name, value } = e.currentTarget;
        const normalizedValue = value.trim();
        if (normalizedValue === value) return;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: normalizedValue } }
        });
    };

    const processImageField = (
        config: TFieldConfig,
        validation: TValidationRuleType,
        files: File[] = [],
        initValue: TFieldValue,
        shouldRemoveImage: boolean
    ): IProcessFieldResult => {
        const { name, optional, allowedTypes, maxSizeMB } = config;
        const imageFile = files[0];
        const fieldStateValue = { files };
        const fieldEntries: TFieldEntries = [];
        let isValueChanged = false;
    
        // Старая картинка есть и не удаляется — ничего не делается
        if (initValue && !shouldRemoveImage) {
            return { isValid: true, fieldStateValue, fieldEntries, isValueChanged };
        }
    
        // Старая картинка есть и должна быть удалена — добавление флага удаления
        if (initValue && shouldRemoveImage) {
            fieldEntries.push(['removeImage', 'true']);
            isValueChanged = true;
        }
    
        // Загружен новый файл — валидация и добавление
        if (imageFile instanceof File) {
            const ruleCheck = typeof validation === 'function'
                ? validation(imageFile, allowedTypes, maxSizeMB)
                : false;
            const isValid = ruleCheck;
            if (!isValid) return { isValid: false, fieldStateValue, fieldEntries, isValueChanged };
    
            fieldEntries.push([name, imageFile]);
            if (!initValue) isValueChanged = true;
        }
    
        // Если файл не загружен, то поле опционально, иначе всё валидно
        return {
            isValid: imageFile ? true : optional ?? false,
            fieldStateValue,
            fieldEntries,
            isValueChanged
        };
    };
    
    const processGenericField = (
        config: TFieldConfig,
        validation: TValidationRuleType,
        value: TFieldValue,
        initValue: TFieldValue
    ): IProcessFieldResult => {
        const { name, trim, optional } = config;
        const normalizedValue = typeof value === 'string' && trim ? value.trim() : String(value);
        const fieldStateValue = { value: normalizedValue };
        const ruleCheck = validation instanceof RegExp
            ? validation.test(normalizedValue)
            : false;

        const isValid = optional ? (!normalizedValue || ruleCheck) : ruleCheck;
        const fieldEntries: TFieldEntries =
            (isValid && (!optional || normalizedValue !== ''))
                ? [[name, normalizedValue]]
                : [];
        const isValueChanged = normalizedValue !== initValue;
    
        return { isValid, fieldStateValue, fieldEntries, isValueChanged };
    };

    const processFormFields = (): IProcessFormFieldsResult<TValidFieldName, TPromoBody> => {
        const result = (Object.entries(fieldsState) as [TValidFieldName, IFieldState][]).reduce(
            (acc, [name, { value, files }]) => {
                const validation = validationRules.promotion[name];
                if (!validation) {
                    console.error(`Отсутствует правило валидации для поля: ${name}`);
                    return acc;
                }

                const config = fieldConfigMap[name] ?? {};
                const initValue = initFieldValuesRef.current[name];
        
                let processFieldResult = name === 'image'
                    ? processImageField(config, validation, files, initValue, shouldRemoveImage)
                    : processGenericField(config, validation, value, initValue);
        
                const { isValid, fieldStateValue, fieldEntries, isValueChanged } = processFieldResult;
        
                acc.fieldsStateUpdates[name] = {
                    ...fieldStateValue,
                    uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
                    error: isValid
                        ? ''
                        : fieldErrorMessages.promotion[name].default || DEFAULT_FIELD_ERROR_MESSAGE
                };
        
                if (isValid) {
                    fieldEntries.forEach(([key, val]) => {
                        (acc.formFields as TFormFields)[key] = val;
                    });

                    if (isValueChanged) acc.changedFields.push(name);
                } else {
                    acc.allValid = false;
                }
        
                return acc;
            },
            {
                allValid: true,
                fieldsStateUpdates: {} as TFieldsStateUpdates,
                formFields: {} as TPromoBody,
                changedFields: [] as TValidFieldName[]
            }
        );
    
        return result;
    };

    const handleFormSubmit = async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        const { allValid, fieldsStateUpdates, formFields, changedFields = [] } = processFormFields();
        
        dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });
        
        if (!allValid) {
            return setSubmitStatus(FORM_STATUS.INVALID);
        } else if (isEditMode && !changedFields.length) {
            return setSubmitStatus(FORM_STATUS.UNCHANGED);
        }

        setSubmitStatus(FORM_STATUS.SENDING);
        dispatch(setNavigationLock(true));

        const requestThunk = isEditMode && promoId
            ? sendPromoUpdateRequest(promoId, formFields)
            : sendPromoCreateRequest(formFields);
        const responseData = await dispatch(requestThunk);
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        const LOG_CTX = `PROMO: ${isEditMode ? 'UPDATE' : 'CREATE'}`;

        switch (status) {
            case FORM_STATUS.UNAUTH:
            case FORM_STATUS.USER_GONE:
            case FORM_STATUS.DENIED:
            case FORM_STATUS.BAD_REQUEST:
            case FORM_STATUS.NOT_FOUND:
            case FORM_STATUS.UNCHANGED:
            case FORM_STATUS.ERROR:
            case FORM_STATUS.TIMEOUT:
                logRequestStatus({ context: LOG_CTX, status, message });
                setSubmitStatus(status);
                dispatch(setNavigationLock(false));
                break;

            case FORM_STATUS.INVALID: {
                const { fieldErrors } = responseData;
                logRequestStatus({ context: LOG_CTX, status, message, details: fieldErrors });

                const fieldsStateUpdates: TFieldsStateUpdates = {};
                (Object.entries(fieldErrors) as [TValidFieldName, string][])
                    .forEach(([name, error]) => {
                        if (name in fieldConfigMap) {
                            fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.INVALID, error };
                        }
                    });
                dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

                setSubmitStatus(status);
                dispatch(setNavigationLock(false));
                break;
            }
        
            case FORM_STATUS.SUCCESS: {
                logRequestStatus({ context: LOG_CTX, status, message });

                const fieldsStateUpdates: TFieldsStateUpdates = {};
                changedFields.forEach(name => {
                    fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.CHANGED };
                });
                dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

                setSubmitStatus(status);

                setTimeout(() => {
                    if (isUnmountedRef.current) return;
                    navigate(routeConfig.promotions.paths[0]);
                }, SUCCESS_DELAY);
                break;
            }
        
            default:
                logRequestStatus({ context: LOG_CTX, status, message, unhandled: true });
                setSubmitStatus(FORM_STATUS.UNKNOWN);
                dispatch(setNavigationLock(false));
                break;
        }
    };

    // Стартовая загрузка акции в режиме редактирования и очистка при размонтировании
    useEffect(() => {
        if (isEditMode && promoId) loadPromo(promoId);

        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Сброс статуса формы при отсутствии ошибок полей
    useEffect(() => {
        if (submitStatus !== FORM_STATUS.INVALID) return;

        const isErrorField = Object.values(fieldsState).some(val => Boolean(val.error));
        if (!isErrorField) setSubmitStatus(FORM_STATUS.DEFAULT);
    }, [submitStatus, fieldsState]);

    return (
        <div className="promo-editor">
            <header className="promo-editor-header">
                <h3>{isEditMode ? 'Редактирование акции' : 'Создание акции'}</h3>
            </header>

            <form className="promo-form" onSubmit={handleFormSubmit} noValidate>
                <div className="form-body">
                    {fieldConfigs.map(({
                        name,
                        label,
                        elem,
                        type,
                        placeholder,
                        accept,
                        autoComplete,
                        trim,
                        optional
                    }) => {
                        const fieldId = `promo-${toKebabCase(name)}`;
                        const fieldInfoClass = getFieldInfoClass(elem, type, name);
                        const hasPrevImage = name === 'image' && !!initFieldValuesRef.current[name];

                        const elemProps: TFieldElemProps = {
                            id: fieldId,
                            name,
                            type,
                            placeholder,
                            value: getStringValue(fieldsState[name]?.value),
                            min: name === 'endDate' ? String(fieldsState.startDate.value) : undefined,
                            accept,
                            autoComplete,
                            onChange: handleFieldChange,
                            onBlur: trim ? handleTrimmedFieldBlur : undefined,
                            disabled: isFormLocked || (hasPrevImage && !shouldRemoveImage)
                        };

                        return (
                            <div key={fieldId} className={cn('form-entry', fieldInfoClass)}>
                                <label htmlFor={fieldId} className="form-entry-label">
                                    {label}:
                                    {optional && <small className="optional">опционально</small>}
                                </label>

                                <div className={cn('form-entry-field', fieldsState[name]?.uiStatus)}>
                                    {hasPrevImage && (
                                        <div className="promo-image-remove-box">
                                            <DesignedCheckbox
                                                id="remove-promo-image"
                                                name="remove-promo-image"
                                                label="Удалить текущее"
                                                checked={shouldRemoveImage}
                                                onChange={(e) =>
                                                    setShouldRemoveImage(e.currentTarget.checked)
                                                }
                                                disabled={isFormLocked}
                                            />
                                        </div>
                                    )}

                                    {createElement(elem, elemProps)}
                                    
                                    {fieldsState[name]?.error && (
                                        <span className="invalid-message">
                                            *{fieldsState[name].error}
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                <FormFooter
                    submitStates={submitStates}
                    submitStatus={submitStatus}
                    uiBlocked={isFormLocked}
                    reloadData={isEditMode ? reloadPromo : null}
                />
            </form>
        </div>
    );
}
