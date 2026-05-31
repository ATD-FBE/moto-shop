import { useReducer, useState, useRef, useEffect, createElement }  from 'react';
import cn from 'classnames';
import FormFooter from '@/components/common/FormFooter.jsx';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import { sendOrderFinancialsEventVoidRequest } from '@/api/orderRequests.js';
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
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { toKebabCase, getFieldInfoClass } from '@/helpers/textHelpers.js';
import { isObjectKey } from '@shared/commonHelpers.js';
import {
    validationRules,
    fieldErrorMessages,
    DEFAULT_FIELD_ERROR_MESSAGE
} from '@shared/fieldRules.js';
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
    IFieldConfig,
    TFieldApiValue,
    IFieldState,
    IProcessFormFieldsResult
} from '@/types/index.js';
import type { TEntityField, IOrderFinancialsEventVoidBody } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TFieldConfigs = typeof fieldConfigs;
type TFieldConfig = TFieldConfigs[number];
type TFieldName = Extract<TFieldConfig['name'], TEntityField<'financials'>>;

interface IVoidEventFormProps {
    orderId: string;
    hasFinancialsEvents: boolean;
}

type TFieldsStateUpdates = Partial<Record<TFieldName, Partial<IFieldState>>>;

type TFormFields = IOrderFinancialsEventVoidBody & {
    eventId: string;
};

type TApiFormFields = {
    [K in keyof TFormFields]: TFieldApiValue;
};

type TFieldElemProps =
    InputHTMLAttributes<HTMLInputElement> &
    TextareaHTMLAttributes<HTMLTextAreaElement>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const getSubmitStates = (): IGetSubmitStatesResult => {
    const base = BASE_SUBMIT_STATES;
    const { DEFAULT, BAD_REQUEST, NOT_FOUND, CONFLICT, INVALID, ERROR, TIMEOUT, SUCCESS } = FORM_STATUS;
    const actionLabel = 'Аннулировать';

    const submitStates: TSubmitStates = {
        ...base,
        [DEFAULT]: { submitBtnLabel: actionLabel },
        [BAD_REQUEST]: { ...base[BAD_REQUEST], submitBtnLabel: actionLabel },
        [NOT_FOUND]: {
            ...base[NOT_FOUND],
            mainMessage: 'Исходный заказ или связанный с ним ресурс не найден.',
            addMessage: 'Аннулирование записи невозможно.',
            locked: false
        },
        [CONFLICT]: { ...base[CONFLICT], submitBtnLabel: actionLabel, locked: false },
        [INVALID]: { ...base[INVALID], submitBtnLabel: actionLabel },
        [ERROR]: { ...base[ERROR], submitBtnLabel: actionLabel },
        [TIMEOUT]: { ...base[TIMEOUT], submitBtnLabel: actionLabel },
        [SUCCESS]: {
            ...base[SUCCESS],
            mainMessage: 'Запись аннулирована!',
            submitBtnLabel: 'Аннулировано'
        }
    };

    const lockedStatuses = getLockedStatuses(submitStates);

    return { submitStates, lockedStatuses };
};

const { submitStates, lockedStatuses } = getSubmitStates();

const fieldConfigs = extendFieldConfigs([
    {
        name: 'eventId',
        label: 'ID записи',
        elem: 'input',
        type: 'text',
        placeholder: 'Укажите ID успешного финансового события',
        trim: true
    },
    {
        name: 'voidedNote',
        label: 'Заметка',
        elem: 'textarea',
        placeholder: 'Укажите причину аннулирования',
        trim: true,
        optional: true
    }
] as const satisfies readonly IFieldConfig[]);

const fieldConfigMap = createFieldConfigMap<TFieldName, TFieldConfig>(fieldConfigs);
const initialFieldsState = createInitialFieldsState<TFieldName>(fieldConfigs);

export default function VoidEventForm(
    { orderId, hasFinancialsEvents }: IVoidEventFormProps
): JSX.Element {
    const [fieldsState, dispatchFieldsState] = useReducer(fieldsStateReducer, initialFieldsState);
    const [submitStatus, setSubmitStatus] = useState<TFormStatus>(FORM_STATUS.DEFAULT);
    const isUnmountedRef = useRef(false);
    const dispatch = useAppDispatch();
    
    const isFormLocked = lockedStatuses.has(submitStatus) || !hasFinancialsEvents;

    const handleFieldChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
        const { name, value } = e.currentTarget;
        if (!isObjectKey(name, fieldConfigMap)) return;

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

    const processFormFields = (): IProcessFormFieldsResult<TFieldName, TFormFields> => {
        const result = (Object.entries(fieldsState) as [TFieldName, IFieldState][]).reduce(
            (acc, [name, { value }]) => {
                const validation = validationRules.financials[name];
                if (!validation) {
                    console.error(`Отсутствует правило валидации для поля: ${name}`);
                    return acc;
                }

                const { trim, optional } = fieldConfigMap[name] ?? {};
                const normalizedValue = typeof value === 'string' && trim ? value.trim() : value;
                const hasValue = normalizedValue !== '';

                const ruleCheck =
                    typeof normalizedValue === 'string' 
                        ? validation.test(normalizedValue)
                        : false;

                const isValid = optional ? (!hasValue || ruleCheck) : ruleCheck;

                acc.fieldsStateUpdates[name] = {
                    value: normalizedValue,
                    uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
                    error: isValid
                        ? ''
                        : fieldErrorMessages.financials[name].default || DEFAULT_FIELD_ERROR_MESSAGE
                };

                if (isValid) {
                    if (hasValue) {
                        (acc.formFields as TApiFormFields)[name] = normalizedValue;
                        acc.changedFields.push(name);
                    }
                } else {
                    acc.allValid = false;
                }
        
                return acc;
            },
            {
                allValid: true,
                fieldsStateUpdates: {} as TFieldsStateUpdates,
                formFields: {} as TFormFields,
                changedFields: [] as TFieldName[]
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
        }

        setSubmitStatus(FORM_STATUS.SENDING);
        dispatch(setNavigationLock(true));

        const { eventId, ...restFormFields } = formFields;
        const params = { orderId, eventId };
        const responseData = await dispatch(sendOrderFinancialsEventVoidRequest(params, restFormFields));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        const LOG_CTX = 'ORDER: VOID FINANCIALS EVENT';

        switch (status) {
            case FORM_STATUS.UNAUTH:
            case FORM_STATUS.USER_GONE:
            case FORM_STATUS.DENIED:
            case FORM_STATUS.BAD_REQUEST:
            case FORM_STATUS.NOT_FOUND:
            case FORM_STATUS.CONFLICT:
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

                    changedFields.forEach(name => {
                        fieldsStateUpdates[name] = { value: '', uiStatus: '' };
                    });
                    dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

                    setSubmitStatus(FORM_STATUS.DEFAULT);
                    dispatch(setNavigationLock(false));
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

    // Установка дефолтного значения в состояние и очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Сброс статуса формы при отсутствии ошибок полей
    useEffect(() => {
        if (submitStatus !== FORM_STATUS.INVALID) return;

        const isErrorField = Object.values(fieldsState).some(state => Boolean(state.error));
        if (!isErrorField) setSubmitStatus(FORM_STATUS.DEFAULT);
    }, [submitStatus, fieldsState]);

    return (
        <form className="void-event-form" onSubmit={handleFormSubmit} noValidate>
            <div className="form-body">
                {fieldConfigs.map(({ name, label, elem, type, placeholder, trim, optional }) => {
                    const fieldId = `order-${orderId}-void-${toKebabCase(name)}`;
                    const fieldInfoClass = getFieldInfoClass(elem, type, name);

                    const elemProps: TFieldElemProps = {
                        id: fieldId,
                        name,
                        type,
                        placeholder,
                        value: getStringValue(fieldsState[name]?.value),
                        autoComplete: 'off',
                        onChange: handleFieldChange,
                        onBlur: trim ? handleFieldBlur : undefined,
                        disabled: isFormLocked
                    };

                    return (
                        <div key={fieldId} className={cn('form-entry', fieldInfoClass)}>
                            <label htmlFor={fieldId} className="form-entry-label">
                                {label}:
                                {optional && <small className="optional">опционально</small>}
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
            />
        </form>
    );
}
