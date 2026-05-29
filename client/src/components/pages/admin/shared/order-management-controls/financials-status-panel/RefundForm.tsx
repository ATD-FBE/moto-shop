import { useMemo, useReducer, useState, useRef, useEffect }  from 'react';
import cn from 'classnames';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import Collapsible from '@/components/common/Collapsible.jsx';
import FormFooter from '@/components/common/FormFooter.jsx';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import {
    sendOrderOfflineRefundApplyRequest,
    sendOrderOnlineRefundsCreateRequest
} from '@/api/orderRequests.js';
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
import { isEmptyableRefundMethod } from '@/helpers/typeGuards.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { formatCurrency, toKebabCase, getFieldInfoClass } from '@/helpers/textHelpers.js';
import { isEqualCurrency, isObjectKey } from '@shared/commonHelpers.js';
import {
    validationRules,
    fieldErrorMessages,
    DEFAULT_FIELD_ERROR_MESSAGE
} from '@shared/fieldRules.js';
import {
    REFUND_METHOD,
    REFUND_METHOD_OPTIONS,
    OFFLINE_REFUND_METHODS,
    BANK_PROVIDER_OPTIONS,
    ORDER_STATUS
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
    IProcessFormFieldsResult,
    TAppThunk
} from '@/types/index.js';
import type {
    TEntityField,
    TRefundMethod,
    TOrderStatus,
    IOrderOfflineRefundApplyBody,
    TOrderOfflineRefundApplyResponse,
    TOrderOnlineRefundsCreateResponse
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TFieldConfigs = typeof fieldConfigs;
type TFieldConfig = TFieldConfigs[number];
type TFieldName = Extract<TFieldConfig['name'], TEntityField<'refund'>>;

interface IRefundFormProps {
    orderId: string;
    orderStatus: TOrderStatus;
    netPaid: number;
    totalAmount: number;
    availableCardRefundAmount: number;
}

interface IGetDefaultFieldsStateParams {
    keepValueFields?: TFieldName[];
    currentState?: TFormState<TFieldName>;
}

type TFieldsStateUpdates = Partial<Record<TFieldName, Partial<IFieldState>>>;

type TApiFormFields = {
    [K in keyof IOrderOfflineRefundApplyBody['transaction']]: TFieldApiValue;
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
        DEFAULT, LOADING, LOAD_ERROR, FORBIDDEN, BAD_REQUEST,
        NOT_FOUND, INVALID, ERROR, TIMEOUT, SUCCESS
    } = FORM_STATUS;
    const actionLabel = 'Вернуть средства';

    const submitStates: TSubmitStates = {
        ...base,
        [DEFAULT]: { submitBtnLabel: actionLabel },
        [LOADING]: { ...base[LOADING], mainMessage: 'Загрузка ресурсов...' },
        [LOAD_ERROR]: { ...base[LOAD_ERROR], mainMessage: 'Не удалось загрузить ресурсы.' },
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
                ? 'Возврат зафиксирован как неуспешный'
                : 'Средства за заказ возвращены',
            submitBtnLabel: markAsFailed ? 'Отправлено' : 'Возвращено'
        }
    };

    const lockedStatuses = getLockedStatuses(submitStates);

    return { submitStates, lockedStatuses };
};

const isOnlineRefundUnavailable = (
    method: TRefundMethod | '',
    availableCardRefundAmount: number
): boolean => method === REFUND_METHOD.CARD_ONLINE && availableCardRefundAmount === 0;

const fieldConfigs = extendFieldConfigs([
    {
        name: 'method',
        label: 'Способ возврата',
        elem: 'select',
        options: [
            { value: '', label: '--- Выбрать способ возврата ---' },
            ...REFUND_METHOD_OPTIONS
        ],
        getNote: (
            { method, availableCardRefundAmount }: {
                method: TRefundMethod | '';
                availableCardRefundAmount: number;
            }
        ): string | null => {
            if (method !== REFUND_METHOD.CARD_ONLINE) return null;
            if (availableCardRefundAmount > 0) {
                const formattedAmount = formatCurrency(availableCardRefundAmount);
                return `Доступно для автовозврата на карты: ${formattedAmount} руб.`;
            }
            return 'Текущий заказ не содержит оплат по картам';
        },
        shouldNote: (
            { method, availableCardRefundAmount, isRefundDisabled }: {
                method: TRefundMethod | '';
                availableCardRefundAmount: number;
                isRefundDisabled: boolean;
            }
        ): boolean =>
            !isOnlineRefundUnavailable(method, availableCardRefundAmount) &&
            !isRefundDisabled
    },
    {
        name: 'provider',
        label: 'Банк',
        elem: 'select',
        options: BANK_PROVIDER_OPTIONS,
        canApply: (
            { method }: { method: TRefundMethod | '' }
        ): boolean => method === REFUND_METHOD.BANK_TRANSFER
    },
    {
        name: 'amount',
        label: 'Сумма возврата',
        elem: 'input',
        type: 'number',
        step: 0.01,
        min: 0,
        canApply: (
            { method }: { method: TRefundMethod | '' }
        ): boolean => !!method && OFFLINE_REFUND_METHODS.includes(method)
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
            { method }: { method: TRefundMethod | '' }
        ): boolean => method === REFUND_METHOD.BANK_TRANSFER
    },
    {
        name: 'markAsFailed',
        label: 'Результат перевода',
        elem: 'checkbox',
        checkboxLabel: 'Отметить возврат как неудачный',
        canApply: (
            { method }: { method: TRefundMethod | '' }
        ): boolean => method === REFUND_METHOD.BANK_TRANSFER
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
            { method, markAsFailed }: { method: TRefundMethod | '', markAsFailed: boolean }
        ): boolean => method === REFUND_METHOD.BANK_TRANSFER && markAsFailed
    },
    {
        name: 'externalReference',
        label: 'Данные источника',
        elem: 'input',
        type: 'text',
        placeholder: 'Номер терминала / чека / RRN',
        autoComplete: 'off',
        trim: true,
        optional: true,
        canApply: (
            { method }: { method: TRefundMethod | '' }
        ): boolean => method === REFUND_METHOD.CARD_OFFLINE
    }
] as const satisfies readonly IFieldConfig[]);

const fieldConfigMap = createFieldConfigMap<TFieldName, TFieldConfig>(fieldConfigs);
const initialFieldsState = createInitialFieldsState<TFieldName>(fieldConfigs);

export default function RefundForm({
    orderId,
    orderStatus,
    netPaid,
    totalAmount,
    availableCardRefundAmount
}: IRefundFormProps): JSX.Element | null {
    const [fieldsState, dispatchFieldsState] = useReducer(fieldsStateReducer, initialFieldsState);
    const [submitStatus, setSubmitStatus] = useState<TFormStatus>(FORM_STATUS.DEFAULT);
    const [initialized, setInitialized] = useState(false);
    const isUnmountedRef = useRef(false);
    const dispatch = useAppDispatch();

    const method = fieldsState.method.value;
    const markAsFailed = fieldsState.markAsFailed.value;

    if (!isEmptyableRefundMethod(method)) {
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
    const isRefundDisabled =
        (!isCancelledOrder && (isEqualCurrency(netPaid, totalAmount) || netPaid < totalAmount)) ||
        (isCancelledOrder && (isEqualCurrency(netPaid, 0) || netPaid < 0));

    const isFormLocked = lockedStatuses.has(submitStatus) || isRefundDisabled;

    const getDefaultFieldsState = (
        { keepValueFields = [], currentState }: IGetDefaultFieldsStateParams = {}
    ): TFieldsStateUpdates => {
        const baseDefaults: Record<TFieldName, TFieldStateValue> = {
            method: '',
            provider: BANK_PROVIDER_OPTIONS[0].value,
            amount: 0,
            transactionId: '',
            markAsFailed: false,
            failureReason: '',
            externalReference: ''
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
        let processedValue;

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
        IOrderOfflineRefundApplyBody['transaction']
    > => {
        const result = (Object.entries(fieldsState) as [TFieldName, IFieldState][]).reduce(
            (acc, [name, { value }]) => {
                const isApplicable = applicabilityMap[name];
                if (!isApplicable) return acc;

                const validation = validationRules.refund[name];
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
                        : fieldErrorMessages.refund[name].default || DEFAULT_FIELD_ERROR_MESSAGE
                };

                if (isValid) {
                    if (normalizedValue !== '') {
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
                formFields: {} as IOrderOfflineRefundApplyBody['transaction'],
                changedFields: [] as TFieldName[]
            }
        );
    
        return result;
    };

    const handleFormSubmit = async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        if (isOnlineRefundUnavailable(method, availableCardRefundAmount)) {
            return setSubmitStatus(FORM_STATUS.FORBIDDEN);
        }

        const { allValid, fieldsStateUpdates, formFields, changedFields = [] } = processFormFields();
        
        dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

        if (!allValid) {
            return setSubmitStatus(FORM_STATUS.INVALID);
        }

        setSubmitStatus(FORM_STATUS.SENDING);
        dispatch(setNavigationLock(true));

        const requestThunk = (
            method === REFUND_METHOD.CARD_ONLINE
                ? sendOrderOnlineRefundsCreateRequest(orderId)
                : sendOrderOfflineRefundApplyRequest(orderId, { transaction: formFields })
        ) as TAppThunk<Promise<TOrderOnlineRefundsCreateResponse | TOrderOfflineRefundApplyResponse>>;

        const responseData = await dispatch(requestThunk);
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        const LOG_CTX = 'ORDER: OFFLINE REFUND';

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

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Установка дефолтных значений полей при инициализации
    useEffect(() => {
        dispatchFieldsState({ type: 'UPDATE', payload: getDefaultFieldsState() });
        setInitialized(true);
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
        <form className="refund-form" onSubmit={handleFormSubmit} noValidate>
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
                    getNote,
                    shouldNote,
                    canApply
                }) => {
                    const fieldId = `order-${orderId}-refund-${toKebabCase(name)}`;
                    const fieldInfoClass = getFieldInfoClass(elem, type, name);
                    const isApplicable = applicabilityMap[name];
                    const note = typeof getNote === 'function'
                        ? getNote({ method, availableCardRefundAmount })
                        : null;
                    const showNote  = !!note && typeof shouldNote === 'function'
                        ? shouldNote({ method, availableCardRefundAmount, isRefundDisabled })
                        : false;
                    const collapsible = !!canApply;

                    const baseElemProps: TFieldElemProps = {
                        id: fieldId,
                        name,
                        autoComplete,
                        onChange: handleFieldChange,
                        disabled: isFormLocked || !isApplicable
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
