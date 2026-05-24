import { useReducer, useState, useRef, useEffect, createElement }  from 'react';
import cn from 'classnames';
import FormFooter from '@/components/common/FormFooter.jsx';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import { sendOrderInternalNoteUpdateRequest } from '@/api/orderRequests.js';
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
    TextareaHTMLAttributes
} from 'react';
import type {
    IGetSubmitStatesResult,
    IFieldConfig,
    TFormStatus,
    TSubmitStates,
    TFieldApiValue,
    IFieldState,
    IProcessFormFieldsResult
} from '@/types/index.js';
import type { TEntityField, IOrderInternalNoteUpdateBody } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TFieldConfigs = typeof fieldConfigs;
type TFieldConfig = TFieldConfigs[number];
type TFieldName = Extract<TFieldConfig['name'], TEntityField<'order'>>;

type TInitFieldValues = Record<TFieldName, TFieldApiValue>;
type TFieldsStateUpdates = Partial<Record<TFieldName, Partial<IFieldState>>>;

interface IInternalNoteFormProps {
    orderId: string;
    internalNote?: string;
}

type TApiFormFields = {
    [K in keyof IOrderInternalNoteUpdateBody]: TFieldApiValue;
};

type TFieldElemProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const getSubmitStates = (): IGetSubmitStatesResult => {
    const base = BASE_SUBMIT_STATES;
    const {
        DEFAULT, FORBIDDEN, BAD_REQUEST, NOT_FOUND, UNCHANGED, INVALID, ERROR, TIMEOUT, SUCCESS
    } = FORM_STATUS;
    const actionLabel = 'Сохранить';

    const submitStates: TSubmitStates = {
        ...base,
        [DEFAULT]: { submitBtnLabel: actionLabel },
        [FORBIDDEN]: { ...base[FORBIDDEN], submitBtnLabel: actionLabel },
        [BAD_REQUEST]: { ...base[BAD_REQUEST], submitBtnLabel: actionLabel },
        [NOT_FOUND]: {
            ...base[NOT_FOUND],
            mainMessage: 'Исходный заказ или связанный с ним ресурс не найден.'
        },
        [UNCHANGED]: {
            ...base[UNCHANGED],
            addMessage: 'Заметка не изменена.',
            submitBtnLabel: actionLabel
        },
        [INVALID]: { ...base[INVALID], submitBtnLabel: actionLabel },
        [ERROR]: { ...base[ERROR], submitBtnLabel: actionLabel },
        [TIMEOUT]: { ...base[TIMEOUT], submitBtnLabel: actionLabel },
        [SUCCESS]: {
            ...base[SUCCESS],
            mainMessage: 'Заметка обновлена!',
            submitBtnLabel: 'Сохранено'
        }
    };

    const lockedStatuses = getLockedStatuses(submitStates);

    return { submitStates, lockedStatuses };
};

const { submitStates, lockedStatuses } = getSubmitStates();

const fieldConfigs = extendFieldConfigs([
    {
        name: 'internalNote',
        label: 'Заметка к заказу',
        elem: 'textarea',
        placeholder: 'Укажите содержание заметки',
        trim: true,
        optional: true
    }
] as const satisfies readonly IFieldConfig[]);

const fieldConfigMap = createFieldConfigMap<TFieldName, TFieldConfig>(fieldConfigs);
const initialFieldsState = createInitialFieldsState<TFieldName>(fieldConfigs);

export default function InternalNoteForm(
    { orderId, internalNote }: IInternalNoteFormProps
): JSX.Element {
    const [fieldsState, dispatchFieldsState] = useReducer(fieldsStateReducer, initialFieldsState);
    const [submitStatus, setSubmitStatus] = useState<TFormStatus>(FORM_STATUS.DEFAULT);

    const initFieldValuesRef = useRef<TInitFieldValues>({} as TInitFieldValues);
    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();
    
    const isFormLocked = lockedStatuses.has(submitStatus);

    const handleFieldChange = (e: ChangeEvent<HTMLTextAreaElement>): void => {
        const { name, value } = e.currentTarget;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value, uiStatus: '', error: '' } }
        });
    };

    const handleFieldBlur = (e: FocusEvent<HTMLTextAreaElement>): void => {
        const { name, value } = e.currentTarget;
        const normalizedValue = value.trim();
        if (normalizedValue === value) return;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: normalizedValue } }
        });
    };

    const processFormFields = (): IProcessFormFieldsResult<
        TFieldName,
        IOrderInternalNoteUpdateBody
    > => {
        const result = (Object.entries(fieldsState) as [TFieldName, IFieldState][]).reduce(
            (acc, [name, { value }]) => {
                const validation = validationRules.order[name];
                if (!validation) {
                    console.error(`Отсутствует правило валидации для поля: ${name}`);
                    return acc;
                }

                const { trim, optional } = fieldConfigMap[name] ?? {};
                const normalizedValue = typeof value === 'string' && trim ? value.trim() : value;
                
                const ruleCheck =
                    typeof normalizedValue === 'string'
                        ? validation.test(normalizedValue)
                        : false;

                const hasValue = normalizedValue !== '';
                const isValid = optional ? (!hasValue || ruleCheck) : ruleCheck;

                acc.fieldsStateUpdates[name] = {
                    value: normalizedValue,
                    uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
                    error: isValid
                        ? ''
                        : fieldErrorMessages.order[name].default || DEFAULT_FIELD_ERROR_MESSAGE
                };

                if (isValid) {
                    (acc.formFields as TApiFormFields)[name] = normalizedValue;

                    const initValue = initFieldValuesRef.current[name];

                    if (normalizedValue !== initValue) {
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
                formFields: {} as IOrderInternalNoteUpdateBody,
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
        } else if (!changedFields.length) {
            return setSubmitStatus(FORM_STATUS.UNCHANGED);
        }

        setSubmitStatus(FORM_STATUS.SENDING);
        dispatch(setNavigationLock(true));

        const responseData = await dispatch(sendOrderInternalNoteUpdateRequest(orderId, formFields));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        const LOG_CTX = 'ORDER: INTERNAL NOTE UPDATE';

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

                    changedFields.forEach(name => {
                        fieldsStateUpdates[name] = { uiStatus: '' };
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
        dispatchFieldsState({
            type: 'UPDATE',
            payload: { internalNote: { value: internalNote ?? '' } }
        });

        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Обновление начальных значений полей через SSE
    useEffect(() => {
        initFieldValuesRef.current.internalNote = internalNote ?? '';
    }, [internalNote]);

    // Сброс статуса формы при отсутствии ошибок полей
    useEffect(() => {
        if (submitStatus !== FORM_STATUS.INVALID) return;

        const isErrorField = Object.values(fieldsState).some(state => Boolean(state.error));
        if (!isErrorField) setSubmitStatus(FORM_STATUS.DEFAULT);
    }, [submitStatus, fieldsState]);

    return (
        <form className="internal-note-form" onSubmit={handleFormSubmit} noValidate>
            <div className="form-body">
                {fieldConfigs.map(({ name, label, elem, type, placeholder, trim, optional }) => {
                    const fieldId = `order-${toKebabCase(name)}`;
                    const fieldInfoClass = getFieldInfoClass(elem, type, name);

                    const elemProps: TFieldElemProps = {
                        id: fieldId,
                        name,
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
