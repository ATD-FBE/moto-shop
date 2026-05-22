import { useMemo, useReducer, useState, useRef, useEffect, createElement } from 'react';
import { useNavigate } from 'react-router-dom';
import cn from 'classnames';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import FormFooter from '@/components/common/FormFooter.jsx';
import {
    sendNotificationRequest,
    sendNotificationCreateRequest,
    sendNotificationUpdateRequest
} from '@/api/notificationRequests.js';
import { routeConfig } from '@/config/appRouting.js';
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
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { isObjectKey } from '@shared/commonHelpers.js';
import {
    validationRules,
    fieldErrorMessages,
    DEFAULT_FIELD_ERROR_MESSAGE
} from '@shared/fieldRules.js';
import {
    FORM_STATUS,
    BASE_SUBMIT_STATES,
    FIELD_UI_STATUS,
    SUCCESS_DELAY
} from '@/config/constants.js';
import type {
    JSX,
    Dispatch,
    SetStateAction,
    ChangeEvent,
    FocusEvent,
    SubmitEvent,
    InputHTMLAttributes,
    TextareaHTMLAttributes
} from 'react';
import type {
    IGetSubmitStatesResult,
    IFieldConfig,
    TFormStatus,
    TSubmitStates,
    TFieldStateValue,
    TFieldApiValue,
    IFieldState,
    IProcessFormFieldsResult
} from '@/types/index.js';
import type {
    TEntityField,
    TValidationRuleType,
    INotificationBody
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TFieldConfigs = ReturnType<typeof getFieldConfigs>;
type TFieldConfig = TFieldConfigs[number];
type TFieldName = Extract<TFieldConfig['name'], TEntityField<'notification'>>;

type TInitFieldValues = Record<TFieldName, TFieldApiValue>;
type TFieldsStateUpdates = Partial<Record<TFieldName, Partial<IFieldState>>>;

interface INotificationEditorProps {
    notificationId: string | null;
    filteredCustomerNamesMap: Record<string, string>;
    selectedCustomerIds: Set<string>;
    setSelectedCustomerIds: Dispatch<SetStateAction<Set<string>>>
}

type TFieldEntries = [keyof INotificationBody, TFieldApiValue][];

interface IProcessFieldResult {
    isValid: boolean;
    normalizedValue: TFieldStateValue;
    fieldEntries: TFieldEntries;
    isValueChanged: boolean;
}

type TApiFormFields = {
    [K in keyof INotificationBody]: TFieldApiValue;
};

type TFieldElemProps =
    InputHTMLAttributes<HTMLInputElement> & 
    TextareaHTMLAttributes<HTMLTextAreaElement>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const RECIPIENTS_SEPARATOR = ', ';

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
        [LOADING]: { ...base[LOADING], mainMessage: 'Загрузка черновика уведомления...' },
        [LOAD_ERROR]: {
            ...base[LOAD_ERROR],
            mainMessage: 'Не удалось загрузить черновик уведомления.'
        },
        [BAD_REQUEST]: { ...base[BAD_REQUEST], submitBtnLabel: actionLabel },
        [NOT_FOUND]: {
            ...base[NOT_FOUND],
            mainMessage: 'Исходное уведомление или связанный с ним ресурс не найден.'
        },
        [UNCHANGED]: {
            ...base[UNCHANGED],
            addMessage: 'Уведомление не изменено.',
            submitBtnLabel: actionLabel
        },
        [INVALID]: { ...base[INVALID], submitBtnLabel: actionLabel },
        [ERROR]: { ...base[ERROR], submitBtnLabel: actionLabel },
        [TIMEOUT]: { ...base[TIMEOUT], submitBtnLabel: actionLabel },
        [SUCCESS]: {
            ...base[SUCCESS],
            mainMessage: isEditMode ? 'Уведомление изменено.' : 'Уведомление создано!',
            addMessage: 'Вы будете перенаправлены на страницу управления уведомлениями.',
            submitBtnLabel: 'Перенаправление...'
        }
    } as const;

    const lockedStatuses = getLockedStatuses(submitStates);

    return { submitStates, lockedStatuses };
};

const getFieldConfigs = (totalSelectedCustomers: number) => {
    const fieldConfigs = [
        {
            name: 'recipients',
            label: `Клиенты-получатели (${totalSelectedCustomers})`,
            elem: 'input',
            type: 'text',
            placeholder: 'Выберите получателей',
            autoComplete: 'off'
        },
        {
            name: 'subject',
            label: 'Тема уведомления',
            elem: 'input',
            type: 'text',
            placeholder: 'Укажите тему уведомления',
            autoComplete: 'on',
            trim: true
        },
        {
            name: 'message',
            label: 'Текст сообщения',
            elem: 'textarea',
            placeholder: 'Введите текст уведомления',
            autoComplete: 'off',
            trim: true
        },
        {
            name: 'signature',
            label: 'Отправитель',
            elem: 'input',
            type: 'text',
            defaultValue: 'Администрация «Мото-Магазина»',
            placeholder: 'Укажите отправителя',
            autoComplete: 'on',
            trim: true
        }
    ] as const satisfies readonly IFieldConfig[];

    return extendFieldConfigs(fieldConfigs);
}

export default function NotificationEditor({
    notificationId,
    filteredCustomerNamesMap,
    selectedCustomerIds,
    setSelectedCustomerIds
}: INotificationEditorProps): JSX.Element {
    const isEditMode = Boolean(notificationId);

    const { submitStates, lockedStatuses } = useMemo(() => getSubmitStates(isEditMode), [isEditMode]);

    const { fieldConfigs, fieldConfigMap } = useMemo(() => {
        const configs = getFieldConfigs(selectedCustomerIds.size);
        const map = createFieldConfigMap<TFieldName, TFieldConfig>(configs);
        
        return { fieldConfigs: configs, fieldConfigMap: map };
    }, [selectedCustomerIds.size]);

    const [fieldsState, dispatchFieldsState] = useReducer(
        fieldsStateReducer,
        fieldConfigs,
        createInitialFieldsState<TFieldName>
    );
    const [submitStatus, setSubmitStatus] = useState<TFormStatus>(
        isEditMode ? FORM_STATUS.LOADING : FORM_STATUS.DEFAULT
    );
    const [lockedRecipientNames, setLockedRecipientNames] = useState<string>('');

    const initFieldValuesRef = useRef<TInitFieldValues>({} as TInitFieldValues);
    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const isFormLocked = lockedStatuses.has(submitStatus);

    const displayRecipientNames = (selectedCustomerIds: Set<string> = new Set()): string =>
        [...selectedCustomerIds]
            .map(id => filteredCustomerNamesMap[id] ?? `<имя неизвестно (ID: ${id})>`)
            .join(RECIPIENTS_SEPARATOR);

    const loadNotification = async (): Promise<void> => {
        if (!notificationId) return;
        
        setSubmitStatus(FORM_STATUS.LOADING);

        const responseData = await dispatch(sendNotificationRequest(notificationId));
        if (isUnmountedRef.current) return;

        const { status, message: statusMsg } = responseData;
        logRequestStatus({ context: 'NOTIFICATION: LOAD SINGLE', status, message: statusMsg });

        if (status !== FORM_STATUS.SUCCESS) {
            const finalStatus = submitStates[status].locked ? status : FORM_STATUS.LOAD_ERROR;
            return setSubmitStatus(finalStatus);
        }

        const { recipients = [], subject, message, signature } = responseData.notification;

        initFieldValuesRef.current = {
            recipients, // Массив
            subject,
            message,
            signature
        };

        dispatchFieldsState({
            type: 'UPDATE',
            payload: {
                recipients: { value: recipients.join(RECIPIENTS_SEPARATOR) }, // Строка
                subject: { value: subject },
                message: { value: message },
                signature: { value: signature }
            }
        });

        setSelectedCustomerIds(new Set(recipients));
        setSubmitStatus(FORM_STATUS.DEFAULT);
    };

    const reloadNotification = (): void => {
        if (isEditMode) loadNotification();
    }

    const handleFieldChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const { name, value } = e.currentTarget;
        if (!isObjectKey(name, fieldConfigMap)) return;
        if (name === 'recipients') return; // Блокировка поля получателей от ручного ввода

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value, uiStatus: '', error: '' } }
        });
    };

    const handleFieldBlur = (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const { name, value } = e.currentTarget;
        if (!isObjectKey(name, fieldConfigMap)) return;

        const normalizedValue = value.trim();
        if (normalizedValue === value) return;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: normalizedValue } }
        });
    };

    const processRecipientsField = (
        config: TFieldConfig,
        validation: TValidationRuleType,
        value: TFieldStateValue,
        initValue: TFieldApiValue
    ): IProcessFieldResult => {
        if (
            typeof value !== 'string' ||
            (
                initValue !== undefined &&
                (!Array.isArray(initValue) || !initValue.every(r => typeof r === 'string'))
            )
        ) {
            return { isValid: false, normalizedValue: value, fieldEntries: [], isValueChanged: false };
        }
        
        const recipientSet = new Set(value.split(RECIPIENTS_SEPARATOR).filter(Boolean));
        const uniqueRecipients = [...recipientSet];
        const initRecipientSet = new Set(initValue ?? []);

        const { name } = config;
        const isValid = typeof validation === 'function' ? validation(uniqueRecipients) : false;
        const fieldEntries: TFieldEntries = [[name, uniqueRecipients]];
        const isValueChanged =
            recipientSet.size !== initRecipientSet.size ||
            uniqueRecipients.some(id => !initRecipientSet.has(id));
    
        return { isValid, normalizedValue: value, fieldEntries, isValueChanged };
    };   

    const processGenericField = (
        config: TFieldConfig,
        validation: TValidationRuleType,
        value: TFieldStateValue,
        initValue: TFieldApiValue
    ): IProcessFieldResult => {
        const { name, trim } = config;
        const normalizedValue = typeof value === 'string' && trim ? value.trim() : value;

        const isValid = validation instanceof RegExp && typeof normalizedValue === 'string'
            ? validation.test(normalizedValue)
            : false;
        const fieldEntries: TFieldEntries = isValid ? [[name, normalizedValue]] : [];
        const isValueChanged = normalizedValue !== (initValue ?? '');
    
        return { isValid, normalizedValue, fieldEntries, isValueChanged };
    };

    const processFormFields = (): IProcessFormFieldsResult<TFieldName, INotificationBody> => {
        const result = (Object.entries(fieldsState) as [TFieldName, IFieldState][]).reduce(
            (acc, [name, { value }]) => {
                const validation = validationRules.notification[name];
                if (!validation) {
                    console.error(`Отсутствует правило валидации для поля: ${name}`);
                    return acc;
                }

                const config = fieldConfigMap[name] ?? {};
                const initValue = initFieldValuesRef.current[name];
    
                const processFieldResult = name === 'recipients'
                    ? processRecipientsField(config, validation, value, initValue)
                    : processGenericField(config, validation, value, initValue);

                const { isValid, normalizedValue, fieldEntries, isValueChanged } = processFieldResult;
    
                acc.fieldsStateUpdates[name] = {
                    value: normalizedValue,
                    uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
                    error: isValid
                        ? ''
                        : fieldErrorMessages.notification[name].default || DEFAULT_FIELD_ERROR_MESSAGE
                };
    
                if (isValid) {
                    fieldEntries.forEach(([key, val]) => {
                        (acc.formFields as TApiFormFields)[key] = val;
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
                formFields: {} as INotificationBody,
                changedFields: [] as TFieldName[]
            }
        );
    
        return result;
    };
    
    const handleFormSubmit = async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        const namesSnapshot = displayRecipientNames(selectedCustomerIds);
        setLockedRecipientNames(namesSnapshot);

        const { allValid, fieldsStateUpdates, formFields, changedFields = [] } = processFormFields();

        dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

        if (!allValid) {
            return setSubmitStatus(FORM_STATUS.INVALID);
        } else if (isEditMode && !changedFields.length) {
            return setSubmitStatus(FORM_STATUS.UNCHANGED);
        }

        setSubmitStatus(FORM_STATUS.SENDING);
        dispatch(setNavigationLock(true));

        const responseData = isEditMode && notificationId
            ? await dispatch(sendNotificationUpdateRequest(notificationId, formFields))
            : await dispatch(sendNotificationCreateRequest(formFields));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        const LOG_CTX = `NOTIFICATION: ${isEditMode ? 'UPDATE' : 'CREATE'}`;

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
                Object.entries(fieldErrors).forEach(([name, error]) => {
                    if (!isObjectKey(name, fieldConfigMap)) return;
                    fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.INVALID, error };
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
                    navigate(routeConfig.adminNotifications.paths[0]);
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

    // Стартовая загрузка уведомления в режиме редактирования и очистка при размонтировании
    useEffect(() => {
        if (isEditMode) loadNotification();

        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Изменение значения поля recipients в стейте (не в инпуте) через выбор клиентов в таблице
    useEffect(() => {
        dispatchFieldsState({
            type: 'UPDATE',
            payload: {
                recipients: {
                    value: [...selectedCustomerIds].join(RECIPIENTS_SEPARATOR),
                    ...(!isFormLocked && {
                        uiStatus: '',
                        error: ''
                    })
                }
            }
        });
    }, [selectedCustomerIds]);

    // Сброс статуса формы при отсутствии ошибок полей
    useEffect(() => {
        if (submitStatus !== FORM_STATUS.INVALID) return;

        const isErrorField = Object.values(fieldsState).some(state => Boolean(state.error));
        if (!isErrorField) setSubmitStatus(FORM_STATUS.DEFAULT);
    }, [submitStatus, fieldsState]);

    return (
        <div className="notification-editor">
            <header className="notification-editor-header">
                <h3>{`${isEditMode ? 'Изменение' : 'Создание'} черновика уведомления`}</h3>
            </header>

            <form className="notification-form" onSubmit={handleFormSubmit} noValidate>
                <div className="form-body">
                    {fieldConfigs.map(({
                        name,
                        label,
                        elem,
                        type,
                        placeholder,
                        autoComplete,
                        trim
                    }) => {
                        const fieldId = `notification-${toKebabCase(name)}`;
                        const fieldInfoClass = getFieldInfoClass(elem, type, name);
    
                        const elemProps: TFieldElemProps = {
                            id: fieldId,
                            name,
                            type,
                            placeholder,
                            value: name === 'recipients'
                                ? isFormLocked
                                    ? lockedRecipientNames
                                    : displayRecipientNames(selectedCustomerIds)
                                : getStringValue(fieldsState[name]?.value),
                            autoComplete,
                            onChange: handleFieldChange,
                            onBlur: trim ? handleFieldBlur : undefined,
                            disabled: isFormLocked
                        };

                        return (
                            <div key={fieldId} className={cn('form-entry', fieldInfoClass)}>
                                <label htmlFor={fieldId} className="form-entry-label">
                                    {label}:
                                </label>

                                <div className={cn('form-entry-field', fieldsState[name]?.uiStatus)}>
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
                    reloadData={isEditMode ? reloadNotification : undefined}
                />
            </form>
        </div>
    );
}
