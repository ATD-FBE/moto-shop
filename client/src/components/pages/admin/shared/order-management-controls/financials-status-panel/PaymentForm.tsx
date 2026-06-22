import { useMemo, useReducer, useState, useRef, useEffect }  from 'react';
import cn from 'classnames';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import Collapsible from '@/components/common/Collapsible.jsx';
import FormFooter from '@/components/common/FormFooter.jsx';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import { sendOrderOfflinePaymentApplyRequest } from '@/api/orderRequests.js';
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
    getStringValue,
    getBoolValue
} from '@/helpers/formHelpers.js';
import { isEmptyablePaymentMethod } from '@/helpers/typeGuards.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { toKebabCase, getFieldInfoClass } from '@/helpers/textHelpers.js';
import { isEqualCurrency, isObjectKey } from '@shared/commonHelpers.js';
import {
    validationRules,
    fieldErrorMessages,
    DEFAULT_FIELD_ERROR_MESSAGE
} from '@shared/fieldRules.js';
import {
    PAYMENT_METHOD,
    OFFLINE_PAYMENT_METHOD_OPTIONS,
    OFFLINE_PAYMENT_METHODS,
    BANK_PROVIDER_OPTIONS,
    ORDER_STATUS,
    CASH_ON_RECEIPT_ALLOWED_STATUSES
} from '@shared/constants.js';
import type {
    JSX,
    ChangeEvent,
    FocusEvent,
    SubmitEvent,
    InputHTMLAttributes,
    SelectHTMLAttributes
} from 'react';
import type {
    IGetSubmitStatesResult,
    TFormStatus,
    TSubmitStates,
    IFieldConfig,
    TFieldStateValue,
    TFieldApiValue,
    IFieldState,
    TFormState,
    IProcessFormFieldsResult
} from '@/types/index.js';
import type {
    TEntityField,
    TPaymentMethod,
    TOrderStatus,
    IOrderOfflinePaymentApplyBody
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TFieldConfigs = typeof fieldConfigs;
type TFieldConfig = TFieldConfigs[number];
type TFieldName = Extract<TFieldConfig['name'], TEntityField<'payment'>>;

interface IIsPaymentBlockedParams {
    method: TPaymentMethod | '';
    orderStatus: TOrderStatus;
    isPaymentDisabled: boolean;
}

interface IPaymentFormProps {
    orderId: string;
    orderStatus: TOrderStatus;
    defaultMethod: TPaymentMethod;
    netPaid: number;
    totalAmount: number;
}

interface IGetDefaultFieldsStateParams {
    keepValueFields?: TFieldName[];
    currentState?: TFormState<TFieldName>;
}

type TFieldsStateUpdates = Partial<Record<TFieldName, Partial<IFieldState>>>;

type TApiFormFields = {
    [K in keyof IOrderOfflinePaymentApplyBody['transaction']]: TFieldApiValue;
};

type TFieldElemProps =
    InputHTMLAttributes<HTMLInputElement> &
    SelectHTMLAttributes<HTMLSelectElement>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const getSubmitStates = (markAsFailed: boolean): IGetSubmitStatesResult => {
    const base = BASE_SUBMIT_STATES;
    const {
        DEFAULT, FORBIDDEN, BAD_REQUEST, NOT_FOUND, INVALID, ERROR, TIMEOUT, SUCCESS
    } = FORM_STATUS;
    const actionLabel = 'Внести оплату';

    const submitStates: TSubmitStates = {
        ...base,
        [DEFAULT]: { submitBtnLabel: actionLabel },
        [FORBIDDEN]: { ...base[FORBIDDEN], submitBtnLabel: actionLabel },
        [BAD_REQUEST]: { ...base[BAD_REQUEST], submitBtnLabel: actionLabel },
        [NOT_FOUND]: {
            ...base[NOT_FOUND],
            mainMessage: 'Исходный заказ или связанный с ним ресурс не найден.'
        },
        [INVALID]: { ...base[INVALID], submitBtnLabel: actionLabel },
        [ERROR]: { ...base[ERROR], submitBtnLabel: actionLabel },
        [TIMEOUT]: { ...base[TIMEOUT], submitBtnLabel: actionLabel },
        [SUCCESS]: {
            ...base[SUCCESS],
            mainMessage: markAsFailed
                ? 'Оплата зафиксирована как неуспешная'
                : 'Оплата за заказ внесена!',
            submitBtnLabel: markAsFailed ? 'Отправлено' : 'Оплачено'
        }
    };

    const lockedStatuses = getLockedStatuses(submitStates);

    return { submitStates, lockedStatuses };
};

const isCashOnReceiptUnavailable = (
    method: TPaymentMethod | '',
    orderStatus: TOrderStatus
): boolean =>
    method === PAYMENT_METHOD.CASH_ON_RECEIPT &&
    !CASH_ON_RECEIPT_ALLOWED_STATUSES.some(s => s === orderStatus);

const isPaymentBlocked = (
    { method, orderStatus, isPaymentDisabled }: IIsPaymentBlockedParams
): boolean => isCashOnReceiptUnavailable(method, orderStatus) && !isPaymentDisabled;

const fieldConfigs = extendFieldConfigs([
    {
        name: 'method',
        label: 'Способ оплаты',
        elem: 'select',
        options: [
            { value: '', label: '--- Выбрать способ оплаты ---' },
            ...OFFLINE_PAYMENT_METHOD_OPTIONS
        ],
        note: 'Заказ ещё не принят',
        shouldNote: isPaymentBlocked
    },
    {
        name: 'provider',
        label: 'Банк',
        elem: 'select',
        options: BANK_PROVIDER_OPTIONS,
        canApply: (
            { method }: { method: TPaymentMethod | '' }
        ): boolean => method === PAYMENT_METHOD.BANK_TRANSFER
    },
    {
        name: 'amount',
        label: 'Сумма оплаты',
        elem: 'input',
        type: 'number',
        step: 0.01,
        min: 0,
        shouldDisable: isPaymentBlocked,
        canApply: ({ method }: { method: TPaymentMethod | '' }): boolean => Boolean(method)
    },
    {
        name: 'transactionId',
        label: 'ID транзакции',
        elem: 'input',
        type: 'text',
        placeholder: 'Укажите ID банковского перевода',
        autoComplete: 'off',
        trim: true,
        canApply: (
            { method }: { method: TPaymentMethod | '' }
        ): boolean => method === PAYMENT_METHOD.BANK_TRANSFER
    },
    {
        name: 'markAsFailed',
        label: 'Результат перевода',
        elem: 'checkbox',
        checkboxLabel: 'Отметить платёж как неудачный',
        canApply: (
            { method }: { method: TPaymentMethod | '' }
        ): boolean => method === PAYMENT_METHOD.BANK_TRANSFER
    },
    {
        name: 'failureReason',
        label: 'Причина отказа',
        elem: 'input',
        type: 'text',
        placeholder: 'Укажите причину отмены перевода',
        autoComplete: 'off',
        trim: true,
        optional: true,
        canApply: (
            { method, markAsFailed }: { method: TPaymentMethod | '', markAsFailed: boolean }
        ): boolean => method === PAYMENT_METHOD.BANK_TRANSFER && markAsFailed
    }
] as const satisfies readonly IFieldConfig[]);

const fieldConfigMap = createFieldConfigMap<TFieldName, TFieldConfig>(fieldConfigs);
const initialFieldsState = createInitialFieldsState<TFieldName>(fieldConfigs);

export default function PaymentForm({
    orderId,
    orderStatus,
    defaultMethod,
    netPaid,
    totalAmount
}: IPaymentFormProps): JSX.Element | null {
    const [fieldsState, dispatchFieldsState] = useReducer(fieldsStateReducer, initialFieldsState);
    const [submitStatus, setSubmitStatus] = useState<TFormStatus>(FORM_STATUS.DEFAULT);
    const [initialized, setInitialized] = useState(false);
    const isUnmountedRef = useRef(false);
    const dispatch = useAppDispatch();

    const method = fieldsState.method.value;
    const markAsFailed = fieldsState.markAsFailed.value;

    if (!isEmptyablePaymentMethod(method)) {
        throw new Error('Неверный тип значения поля method в состоянии формы');
    }
    if (typeof markAsFailed !== 'boolean') {
        throw new Error('Неверный тип значения поля markAsFailed в состоянии формы');
    }

    const applicabilityMap = useMemo(
        () => Object.fromEntries(
            fieldConfigs.map(cfg => [
                cfg.name,
                typeof cfg.canApply === 'function' ? cfg.canApply({ method, markAsFailed }) : true
            ])
        ) as Record<TFieldName, boolean>,
        [method, markAsFailed]
    );
    const { submitStates, lockedStatuses } = useMemo(
        () => getSubmitStates(markAsFailed),
        [markAsFailed]
    );
    
    const isCancelledOrder = orderStatus === ORDER_STATUS.CANCELLED;
    const isPaymentDisabled =
        (!isCancelledOrder && (isEqualCurrency(netPaid, totalAmount) || netPaid > totalAmount)) ||
        (isCancelledOrder && (isEqualCurrency(netPaid, 0) || netPaid > 0));
    
    const isFormLocked = lockedStatuses.has(submitStatus) || isPaymentDisabled;

    const getDefaultFieldsState = (
        { keepValueFields = [], currentState }: IGetDefaultFieldsStateParams = {}
    ): TFieldsStateUpdates => {
        const baseDefaults: Record<TFieldName, TFieldStateValue> = {
            method: OFFLINE_PAYMENT_METHODS.includes(defaultMethod) ? defaultMethod : '',
            provider: BANK_PROVIDER_OPTIONS[0].value,
            amount: 0,
            transactionId: '',
            markAsFailed: false,
            failureReason: ''
        };
    
        return Object.fromEntries(
            (Object.entries(baseDefaults) as [TFieldName, TFieldStateValue][])
                .map(([name, defaultValue]) => {
                    const keep = keepValueFields.includes(name);
                    const value = keep ? currentState?.[name]?.value ?? defaultValue : defaultValue;
                    return [name, { value, uiStatus: '', error: '' }];
                })
        );
    };

    const handleFieldChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
        const target = e.currentTarget;
        const { name, type, value } = target;
        if (!isObjectKey(name, fieldConfigMap)) return;

        const checked = 'checked' in target ? target.checked : false;
        let processedValue: TFieldStateValue | undefined;

        if (type === 'number' && value !== '') {
            processedValue = Number(value.replace(',', '.'));
        } else if (type === 'checkbox') {
            processedValue = checked;
        } else {
            processedValue = value;
        }

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: processedValue, uiStatus: '', error: '' } }
        });
    };

    const handleFieldBlur = (e: FocusEvent<HTMLInputElement>): void => {
        const target = e.currentTarget;
        const { name, value } = target;
        if (!isObjectKey(name, fieldConfigMap)) return;

        const normalizedValue = value.trim();
        if (normalizedValue === value) return;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: normalizedValue } }
        });
    };

    const processFormFields = (): IProcessFormFieldsResult<
        TFieldName,
        IOrderOfflinePaymentApplyBody['transaction']
    > => {
        const result = (Object.entries(fieldsState) as [TFieldName, IFieldState][]).reduce(
            (acc, [name, { value }]) => {
                const isApplicable = applicabilityMap[name];
                if (!isApplicable) return acc;

                const validation = validationRules.payment[name];
                if (!validation) {
                    console.error(`Отсутствует правило валидации для поля: ${name}`);
                    return acc;
                }

                const { trim, optional } = fieldConfigMap[name] ?? {};
                const normalizedValue = typeof value === 'string' && trim ? value.trim() : value;
                const hasValue = normalizedValue !== '';

                const ruleCheck =
                    typeof validation === 'function'
                        ? validation(normalizedValue)
                        : typeof normalizedValue === 'string' 
                            ? validation.test(normalizedValue) 
                            : false;

                const isValid = optional ? (!hasValue || ruleCheck) : ruleCheck;

                acc.fieldsStateUpdates[name] = {
                    value: normalizedValue,
                    uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
                    error: isValid
                        ? ''
                        : fieldErrorMessages.payment[name].default || DEFAULT_FIELD_ERROR_MESSAGE
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
                formFields: {} as IOrderOfflinePaymentApplyBody['transaction'],
                changedFields: [] as TFieldName[]
            }
        );
    
        return result;
    };

    const handleFormSubmit = async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        if (isCashOnReceiptUnavailable(method, orderStatus)) {
            return setSubmitStatus(FORM_STATUS.FORBIDDEN);
        }

        const { allValid, fieldsStateUpdates, formFields, changedFields = [] } = processFormFields();
        
        dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

        if (!allValid) {
            return setSubmitStatus(FORM_STATUS.INVALID);
        }

        setSubmitStatus(FORM_STATUS.SENDING);
        dispatch(setNavigationLock(true));

        const responseData = await dispatch(sendOrderOfflinePaymentApplyRequest(orderId, {
            transaction: formFields
        }));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        const LOG_CTX = 'ORDER: OFFLINE PAYMENT';

        switch (status) {
            case FORM_STATUS.UNAUTH:
            case FORM_STATUS.USER_GONE:
            case FORM_STATUS.DENIED:
            case FORM_STATUS.FORBIDDEN:
            case FORM_STATUS.BAD_REQUEST:
            case FORM_STATUS.NOT_FOUND:
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

                    const resetPayload = getDefaultFieldsState({
                        keepValueFields: ['method', 'provider'],
                        currentState: fieldsState
                    });
                    dispatchFieldsState({ type: 'UPDATE', payload: resetPayload });

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

    // Установка дефолтных значений полей при инициализации и очистка при размонтировании
    useEffect(() => {
        dispatchFieldsState({ type: 'UPDATE', payload: getDefaultFieldsState() });
        setInitialized(true);

        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Сброс ошибок полей и статуса формы при смене метода
    useEffect(() => {
        const fieldsStateUpdates: TFieldsStateUpdates = {};
        Object.keys(fieldsState).forEach(name => {
            if (!isObjectKey(name, fieldConfigMap)) return;
            fieldsStateUpdates[name] = { uiStatus: '', error: '' };
        });
        dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });
        
        setSubmitStatus(FORM_STATUS.DEFAULT);
    }, [method]);

    // Сброс статуса формы при отсутствии ошибок полей
    useEffect(() => {
        if (submitStatus !== FORM_STATUS.INVALID) return;

        const isErrorField = Object.values(fieldsState).some(state => Boolean(state.error));
        if (!isErrorField) setSubmitStatus(FORM_STATUS.DEFAULT);
    }, [submitStatus, fieldsState]);

    if (!initialized) return null;

    return (
        <form className="payment-form" onSubmit={handleFormSubmit} noValidate>
            <div className="form-body">
                {fieldConfigs.map(({
                    name,
                    label,
                    elem,
                    type,
                    step,
                    min,
                    options,
                    checkboxLabel,
                    placeholder,
                    autoComplete,
                    trim,
                    optional,
                    note,
                    shouldNote,
                    shouldDisable,
                    canApply
                }) => {
                    const fieldId = `order-${orderId}-payment-${toKebabCase(name)}`;
                    const fieldInfoClass = getFieldInfoClass(elem, type, name);
                    const isApplicable = applicabilityMap[name];
                    const showNote  = typeof shouldNote === 'function'
                        ? shouldNote({ method, orderStatus, isPaymentDisabled })
                        : false;
                    const isDisabled = typeof shouldDisable === 'function'
                        ? shouldDisable({ method, orderStatus, isPaymentDisabled })
                        : false;
                    const collapsible = !!canApply;

                    const baseElemProps: TFieldElemProps = {
                        id: fieldId,
                        name,
                        autoComplete,
                        onChange: handleFieldChange,
                        disabled: isFormLocked || !isApplicable || isDisabled
                    };
    
                    const fieldElem = (() => {
                        if (elem === 'select') return (
                            <select
                                {...baseElemProps}
                                value={getStringValue(fieldsState[name]?.value)}
                            >
                                {options.map((option, idx) => (
                                    <option key={`${idx}-${option.value}`} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        );
                        
                        if (elem === 'checkbox') return (
                            <DesignedCheckbox
                                {...baseElemProps}
                                label={checkboxLabel}
                                checked={getBoolValue(fieldsState[name]?.value)}
                            />
                        );
                    
                        return (
                            <input
                                {...baseElemProps}
                                type={type}
                                step={step}
                                min={min}
                                placeholder={placeholder}
                                value={getStringValue(fieldsState[name]?.value)}
                                onBlur={trim ? handleFieldBlur : undefined}
                            />
                        );
                    })();

                    const formEntryElem = (
                        <div key={fieldId} className={cn('form-entry', fieldInfoClass)}>
                            <label htmlFor={fieldId} className="form-entry-label">
                                {label}:
                                {optional && <small className="optional">опционально</small>}
                            </label>

                            <div className={cn('form-entry-field', fieldsState[name]?.uiStatus)}>
                                {fieldElem}

                                {showNote  && <span className="note">*{note}</span>}

                                {fieldsState[name]?.error && !showNote  && (
                                    <span className="invalid-message">
                                        *{fieldsState[name].error}
                                    </span>
                                )}
                            </div>
                        </div>
                    );

                    if (collapsible) {
                        return (
                            <Collapsible
                                key={fieldId}
                                isExpanded={isApplicable}
                                className="form-entry-collapsible"
                                showContextIndicator={false}
                            >
                                {formEntryElem}
                            </Collapsible>
                        );
                    }

                    return formEntryElem;
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
