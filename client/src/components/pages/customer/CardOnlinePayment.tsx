import { useReducer, useState, useRef, useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import cn from 'classnames';
import FormFooter from '@/components/common/FormFooter.jsx';
import NotFound from '@/components/pages/NotFound.jsx';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import useExternalScript from '@/hooks/useExternalScript.js';
import {
    sendOrderRemainingAmountRequest,
    sendOrderOnlinePaymentCreateRequest
} from '@/api/orderRequests.js';
import { routeConfig } from '@/config/appRouting.js';
import { YOOKASSA_SCRIPT } from '@/config/externalScripts.js';
import {
    YOOKASSA_SHOP_ID,
    FORM_STATUS,
    BASE_SUBMIT_STATES,
    FIELD_UI_STATUS,
    SUCCESS_DELAY,
    EXTERNAL_SCRIPT_STATUS
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
import { parseRouteParams } from '@/helpers/routeHelpers.js';
import { processFormattedFieldDeletion, calcFormattedFieldCursorPos } from '@/helpers/formHelpers.js';
import { toKebabCase, getFieldInfoClass } from '@/helpers/textHelpers.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { toError, isObjectKey } from '@shared/commonHelpers.js';
import { resolveRequestStatus } from '@shared/statusResolver.js';
import {
    validationRules,
    fieldErrorMessages,
    DEFAULT_FIELD_ERROR_MESSAGE
} from '@shared/fieldRules.js';
import { CARD_ONLINE_PROVIDER_OPTIONS } from '@shared/constants.js';
import type {
    JSX,
    ChangeEvent,
    KeyboardEvent,
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
    TFieldApiValue,
    IFieldState,
    TFormState,
    IProcessFormFieldsResult as IOriginalProcessFormFieldsResult,
    TFieldStateValue,
    IYooMoneyCheckoutInstance
} from '@/types/index.js';
import type {
    TEntityField,
    TRequestStatus,
    IOrderOnlinePaymentCreateBody
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TFieldConfigs = typeof fieldConfigs;
type TFieldConfig = TFieldConfigs[number];
type TFieldName = Extract<TFieldConfig['name'], TEntityField<'payment'>>;

type TFieldsStateUpdates = Partial<Record<TFieldName, Partial<IFieldState>>>;

type TFormBody = IOrderOnlinePaymentCreateBody['transaction'];

type TFormFields = TFormBody & {
    cardNumber: string;
    cvc: string;
    expiryDate: string;
};

type TApiFormFields = {
    [K in keyof TFormFields]: TFieldApiValue;
};

type TCollectAndValidateFieldsResult = IOriginalProcessFormFieldsResult<TFieldName, TFormBody> & {
    checkoutFields: Record<string, string>;
};

type TTokenizeYooMoneyCheckoutFieldsResult = {
    errorRequestStatus: TRequestStatus;
    checkoutFieldErrors?: TFieldsStateUpdates;
} | {
    paymentToken: string;
};

type TProcessFormFieldsResult = {
    fieldsStateUpdates: TFieldsStateUpdates;
} & (
    {
        errorRequestStatus: TRequestStatus;
    } | {
        paymentToken: string;
        formFields: TFormBody;
        changedFields: TFieldName[];
    }
);

type TFieldElemProps =
    InputHTMLAttributes<HTMLInputElement> &
    SelectHTMLAttributes<HTMLSelectElement>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const getSubmitStates = (hasConfirmationUrl: boolean): IGetSubmitStatesResult => {
    const base = BASE_SUBMIT_STATES;
    const {
        DEFAULT, LOADING, LOAD_ERROR, BAD_REQUEST, NOT_FOUND, INVALID, ERROR, TIMEOUT, SUCCESS
    } = FORM_STATUS;
    const actionLabel = 'Оплатить';

    const submitStates: TSubmitStates = {
        ...base,
        [DEFAULT]: { submitBtnLabel: actionLabel },
        [LOADING]: { ...base[LOADING], mainMessage: 'Загрузка ресурсов...' },
        [LOAD_ERROR]: { ...base[LOAD_ERROR], mainMessage: 'Не удалось загрузить ресурсы.' },
        [BAD_REQUEST]: { ...base[BAD_REQUEST], submitBtnLabel: actionLabel },
        [NOT_FOUND]: {
            ...base[NOT_FOUND],
            mainMessage: 'Исходный заказ или связанный с ним ресурс не найден.',
            addMessage: 'Оплата невозможна.',
        },
        [INVALID]: { ...base[INVALID], submitBtnLabel: actionLabel },
        [ERROR]: { ...base[ERROR], submitBtnLabel: actionLabel },
        [TIMEOUT]: { ...base[TIMEOUT], submitBtnLabel: actionLabel },
        [SUCCESS]: {
            ...base[SUCCESS],
            mainMessage: 'Платёж создан и обрабатывается!',
            addMessage: hasConfirmationUrl
                ? 'Вы будете перенаправлены на страницу подтверждения оплаты.'
                : 'Вы будете перенаправлены на страницу деталей заказа.',
            submitBtnLabel: 'Перенаправление...'
        }
    };

    const lockedStatuses = getLockedStatuses(submitStates);

    return { submitStates, lockedStatuses };
};

const fieldConfigs = extendFieldConfigs([
    {
        name: 'provider',
        label: 'Провайдер',
        elem: 'select',
        options: CARD_ONLINE_PROVIDER_OPTIONS
    },
    {
        name: 'amount',
        label: 'Сумма оплаты',
        elem: 'input',
        type: 'number',
        step: 0.01,
        min: 0
    },
    {
        name: 'cardNumber',
        label: 'Номер карты',
        elem: 'input',
        type: 'text',
        maxLength: 19, // 4 * 4 цифры + 3 пробела между группами
        placeholder: '0000 0000 0000 0000',
        autoComplete: 'cc-number',
        checkout: { fields: [{ name: 'number', errorCode: 'invalid_number' }] },
        hasFormatSeparators: true,
        charRegex: /\d/,
        format: (value: string): string => {
            const digits = value.replace(/\D/g, '').slice(0, 16);
        
            return digits.length < 16
                ? digits.replace(/(\d{4})/g, '$1 ')
                : digits.replace(/(\d{4})(?=\d)/g, '$1 ');
        },
        submitTransform: (value: string): string => value.replace(/\s/g, '')
    },
    {
        name: 'cvc',
        label: 'Код CVC',
        elem: 'input',
        type: 'password',
        maxLength: 4,
        placeholder: '000(0)',
        autoComplete: 'cc-csc',
        checkout: { fields: [{ name: 'cvc', errorCode: 'invalid_cvc' }] },
        format: (value: string): string => value.replace(/\D/g, '').slice(0, 4)
    },
    {
        name: 'expiryDate',
        label: 'Срок действия',
        elem: 'input',
        type: 'text',
        maxLength: 7,
        placeholder: 'ММ / ГГ',
        autoComplete: 'cc-exp',
        trim: true,
        checkout: {
            fields: [
                { name: 'month', errorCode: 'invalid_expiry_month' },
                { name: 'year', errorCode: 'invalid_expiry_year' }
            ],
            split: '/'
        },
        hasFormatSeparators: true,
        charRegex: /\d/,
        format: (value: string): string =>
            value.replace(/\D/g, '').replace(/(\d{2})/, '$1 / ').slice(0, 7),
        submitTransform: (value: string): string => value.replace(/\s/g, '')
    }
] as const satisfies readonly IFieldConfig[]);

const fieldNameByCheckoutErrorCode = fieldConfigs.reduce((acc, config) => {
    config.checkout?.fields.forEach(({ errorCode }) => {
        acc[errorCode] = config.name;
    });
    
    return acc;
}, {} as Record<string, TFieldName>);

const fieldConfigMap = createFieldConfigMap<TFieldName, TFieldConfig>(fieldConfigs);
const initialFieldsState = createInitialFieldsState<TFieldName>(fieldConfigs);

export default function CardOnlinePayment(): JSX.Element | null {
    const { orderId, orderNumber } = parseRouteParams({
        routeKey: 'customerOrderCardOnlinePayment',
        params: useParams()
    });
    
    if (!orderId || !orderNumber) return <NotFound />;

    const [fieldsState, dispatchFieldsState] = useReducer(fieldsStateReducer, initialFieldsState);
    const [submitStatus, setSubmitStatus] = useState<TFormStatus>(FORM_STATUS.LOADING);
    const [loadingRemainingAmount, setLoadingRemainingAmount] = useState(false);
    const [confirmationUrl, setConfirmationUrl] = useState<string | null>(null);

    const yooMoneyCheckoutRef = useRef<IYooMoneyCheckoutInstance | null>(null);
    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    const hasConfirmationUrl = Boolean(confirmationUrl);

    const { submitStates, lockedStatuses } = useMemo(
        () => getSubmitStates(hasConfirmationUrl),
        [hasConfirmationUrl]
    );

    const isFormLocked = lockedStatuses.has(submitStatus) || loadingRemainingAmount;

    const onCheckoutLoad = (): void => {
        if (isUnmountedRef.current) return;
        
        if (!yooMoneyCheckoutRef.current && window.YooMoneyCheckout) {
            yooMoneyCheckoutRef.current = new window.YooMoneyCheckout(YOOKASSA_SHOP_ID, {
                language: 'ru'
            });
        }

        setSubmitStatus(FORM_STATUS.DEFAULT);
    };

    const onCheckoutLoadError = (): void => {
        if (isUnmountedRef.current) return;

        console.error('Ошибка при загрузке скрипта Checkout.js');
        setSubmitStatus(FORM_STATUS.LOAD_ERROR);
    };

    const onCheckoutReload = (): void => {
        setSubmitStatus(FORM_STATUS.LOADING);
        reloadScript();
    }

    const calcRemainingAmount = async (): Promise<void> => {
        setLoadingRemainingAmount(true);

        const responseData = await dispatch(sendOrderRemainingAmountRequest(orderId));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        logRequestStatus({ context: 'ORDER: LOAD REMAINING AMOUNT', status, message });

        if (status !== FORM_STATUS.SUCCESS) {
            setSubmitStatus(status);
        } else {
            const { remainingAmount, orderNumber } = responseData;

            dispatchFieldsState({
                type: 'UPDATE',
                payload: { amount: { value: remainingAmount, uiStatus: '', error: '' } }
            });
            navigate(
                routeConfig.customerOrderCardOnlinePayment.generatePath({ orderId, orderNumber }),
                { replace: true }
            );
        }

        setLoadingRemainingAmount(false);
    };

    const handleFieldChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
        const target = e.currentTarget;
        const { name, type, value } = target;
        if (!isObjectKey(name, fieldConfigMap)) return;

        const { format, hasFormatSeparators, charRegex = /\d/ } = fieldConfigMap[name] ?? {};
        let processedValue: TFieldStateValue | undefined;

        if (format) {
            processedValue = format(value)
        } else if (type === 'number' && value !== '') {
            processedValue = Number(value.replace(',', '.'));
        } else {
            processedValue = value;
        }

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: processedValue, uiStatus: '', error: '' } }
        });
        
        // Пересчёт и установка позиции курсора при форматировании с разделителями после ререндера
        if (
            hasFormatSeparators &&
            format && // На всякий случай, если будет рассогласовние с hasFormatSeparators в конфиге
            target instanceof HTMLInputElement &&
            typeof processedValue === 'string'
        ) {
            const cursorPos = target.selectionStart;

            requestAnimationFrame(() => {
                const newCursorPos = calcFormattedFieldCursorPos(
                    cursorPos,
                    value,
                    processedValue,
                    charRegex
                );

                const safePos = Math.min(newCursorPos, target.value.length);
                target.setSelectionRange(safePos, safePos);
            });
        }
    };

    const handleFieldKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
        const target = e.currentTarget;
        const { name, value } = target;
        if (!isObjectKey(name, fieldConfigMap)) return;

        const config = fieldConfigMap[name];
        if (!config?.hasFormatSeparators) return;
    
        const { selectionStart, selectionEnd } = target;
        const result = processFormattedFieldDeletion(e, {
            value,
            selectionStart,
            selectionEnd,
            charRegex: config.charRegex,
            format: config.format
        });
        if (!result) return;
    
        if (result.preventDefault) {
            e.preventDefault();
        }
    
        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: result.nextValue, uiStatus: '', error: '' } }
        });
    
        // Установка позиции курсора после ререндера
        requestAnimationFrame(() => {
            const safePos = Math.min(result.nextCursorPos, target.value.length);
            target.setSelectionRange(safePos, safePos);
        });
    };

    const handleFieldBlur = (e: FocusEvent<HTMLInputElement>): void => {
        const { name, value } = e.currentTarget;
        if (!isObjectKey(name, fieldConfigMap)) return;

        const normalizedValue = value.trim();
        if (normalizedValue === value) return;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: normalizedValue } }
        });
    };

    const collectAndValidateFields = (
        fieldsState: TFormState<TFieldName>
    ): TCollectAndValidateFieldsResult => {
        const result = (Object.entries(fieldsState) as [TFieldName, IFieldState][]).reduce(
            (acc, [name, { value }]) => {
                const validation = validationRules.payment[name];
                if (!validation) {
                    console.error(`Отсутствует правило валидации для поля: ${name}`);
                    return acc;
                }

                const { checkout, trim, optional, submitTransform } = fieldConfigMap[name] ?? {};
                const normalizedValue = typeof value === 'string' && trim ? value.trim() : value;
                const hasValue = normalizedValue !== '';

                const ruleCheck =
                    typeof validation === 'function'
                        ? validation(normalizedValue, { split: checkout?.split })
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
                    const submittedValue = submitTransform && typeof normalizedValue === 'string'
                        ? submitTransform(normalizedValue)
                        : normalizedValue;

                    if (checkout && typeof submittedValue === 'string') {
                        const splittedValues = checkout.split
                            ? submittedValue.split(checkout.split)
                            : [submittedValue];
                    
                        checkout.fields.forEach((field, idx) => {
                            const value = splittedValues[idx];
                            if (value) acc.checkoutFields[field.name] = value;
                        });
                    } else {
                        (acc.formFields as TApiFormFields)[name] = submittedValue;
                    }

                    acc.changedFields.push(name);
                } else {
                    acc.allValid = false;
                }
        
                return acc;
            },
            {
                allValid: true,
                fieldsStateUpdates: {} as TFieldsStateUpdates,
                checkoutFields: {} as Record<string, string>,
                formFields: {} as IOrderOnlinePaymentCreateBody['transaction'],
                changedFields: [] as TFieldName[]
            }
        );
    
        return result;
    };

    const tokenizeYooMoneyCheckoutFields = async (
        checkout: IYooMoneyCheckoutInstance | null,
        checkoutFields: Record<string, string>
    ): Promise<TTokenizeYooMoneyCheckoutFieldsResult> => {
        try {
            if (!checkout) {
                throw new Error('Экземпляр YooMoney Checkout не инициализирован');
            }

            const response = await checkout.tokenize(checkoutFields);
    
            if (response.status === 'error' && response.error) {
                if (response.error.type === 'validation_error') {
                    const checkoutFieldErrors: TFieldsStateUpdates = {};
        
                    response.error.params.forEach(param => {
                        const fieldName = fieldNameByCheckoutErrorCode[param.code];
                        if (!fieldName) return;
        
                        checkoutFieldErrors[fieldName] = {
                            uiStatus: FIELD_UI_STATUS.INVALID,
                            error:
                                fieldErrorMessages.payment[fieldName]?.default ||
                                param.message ||
                                DEFAULT_FIELD_ERROR_MESSAGE
                        };
                    });
        
                    return {
                        errorRequestStatus: FORM_STATUS.INVALID,
                        checkoutFieldErrors
                    };
                }
        
                console.warn('YooKassa error:', response.error);
                
                const rawStatusCode = Number(response.error.status_code);
                const statusCode = Number.isInteger(rawStatusCode) && rawStatusCode >= 500 ? 500 : 400;
                return { errorRequestStatus: resolveRequestStatus(statusCode) };
            }
        
            const paymentToken = response.data?.response?.paymentToken;

            if (!paymentToken) {
                throw new Error(`Токен оплаты отсутствует, статус: ${response.status}`);
            }

            return { paymentToken };
        } catch (err) {
            console.error(toError(err).message);
            return { errorRequestStatus: FORM_STATUS.ERROR };
        }
    };

    const processFormFields = async (): Promise<TProcessFormFieldsResult> => {
        // Валидация, сбор и структуризация значений полей
        const collected = collectAndValidateFields(fieldsState);
    
        if (!collected.allValid) {
            return {
                fieldsStateUpdates: collected.fieldsStateUpdates,
                errorRequestStatus: FORM_STATUS.INVALID
            };
        }
    
        // Валидация полей карты через скрипт YouMoney и получение платёжного токена
        const tokenizeResult = await tokenizeYooMoneyCheckoutFields(
            yooMoneyCheckoutRef.current,
            collected.checkoutFields
        );

        if ('errorRequestStatus' in tokenizeResult) {
            // Объединение состояний полей при ошибках валидации через скрипт
            const tokenizeErrors = tokenizeResult.checkoutFieldErrors;
            let mergedFieldsStateUpdates: TFieldsStateUpdates = collected.fieldsStateUpdates;

            if (tokenizeErrors) {
                mergedFieldsStateUpdates = Object.fromEntries(
                    (Object.entries(collected.fieldsStateUpdates) as [TFieldName, Partial<IFieldState>][])
                        .map(([name, state]) => [
                            name,
                            tokenizeErrors[name]
                                ? { ...state, ...tokenizeErrors[name] }
                                : state
                        ])
                );
            }

            return {
                fieldsStateUpdates: mergedFieldsStateUpdates,
                errorRequestStatus: tokenizeResult.errorRequestStatus
            };
        }
    
        return {
            fieldsStateUpdates: collected.fieldsStateUpdates,
            paymentToken: tokenizeResult.paymentToken,
            formFields: collected.formFields,
            changedFields: collected.changedFields = []
        };
    };
    
    const handleFormSubmit = async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        setSubmitStatus(FORM_STATUS.SENDING);
        dispatch(setNavigationLock(true));

        const processResult = await processFormFields();
        if (isUnmountedRef.current) return;

        const { fieldsStateUpdates } = processResult;
        dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

        if ('errorRequestStatus' in processResult) {
            setSubmitStatus(processResult.errorRequestStatus);
            dispatch(setNavigationLock(false));
            return;
        }

        const { paymentToken, formFields, changedFields } = processResult;

        // Отправка данных на сервер
        const responseData = await dispatch(sendOrderOnlinePaymentCreateRequest(orderId, {
            paymentToken,
            transaction: formFields
        }));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        const LOG_CTX = 'ORDER: ONLINE PAYMENT';

        switch (status) {
            case FORM_STATUS.UNAUTH:
            case FORM_STATUS.USER_GONE:
            case FORM_STATUS.DENIED:
            case FORM_STATUS.FORBIDDEN:
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
                const { confirmationUrl } = responseData;
                logRequestStatus({ context: LOG_CTX, status, message });

                const fieldsStateUpdates: TFieldsStateUpdates = {};
                changedFields.forEach(name => {
                    fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.CHANGED };
                });
                dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

                setConfirmationUrl(confirmationUrl);
                setSubmitStatus(status);

                setTimeout(() => {
                    if (confirmationUrl) {
                        // Переход на страницу 3-D Secure платёжки
                        // Текущий адрес не сохраняется в истории браузера
                        window.location.replace(confirmationUrl);
                    } else {
                        if (isUnmountedRef.current) return;
                        
                        navigate(routeConfig.customerOrderDetails.generatePath({
                            orderId,
                            orderNumber
                        }));
                    }
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

    // Загрузка скрипта YooKassa
    const { status: scriptStatus, reload: reloadScript } = useExternalScript(YOOKASSA_SCRIPT);

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Обработка статуса загрузки скрипта YooKassa
    useEffect(() => {
        if (scriptStatus === EXTERNAL_SCRIPT_STATUS.READY) onCheckoutLoad();
        if (scriptStatus === EXTERNAL_SCRIPT_STATUS.ERROR) onCheckoutLoadError();
    }, [scriptStatus]);

    // Сброс статуса формы при отсутствии ошибок полей
    useEffect(() => {
        if (submitStatus !== FORM_STATUS.INVALID) return;

        const isErrorField = Object.values(fieldsState).some(state => Boolean(state.error));
        if (!isErrorField) setSubmitStatus(FORM_STATUS.DEFAULT);
    }, [submitStatus, fieldsState]);

    return (
        <div className="card-online-payment-page">
            <header className="card-online-payment-header">
                <h3>Оплата заказа №{orderNumber} банковской картой онлайн</h3>
            </header>

            <form className="card-online-payment-form" onSubmit={handleFormSubmit} noValidate>
                <div className="form-body">
                    {fieldConfigs.map(({
                        name,
                        label,
                        elem,
                        type,
                        options,
                        maxLength,
                        placeholder,
                        autoComplete,
                        trim
                    }) => {
                        const fieldId = `order-${orderId}-online-payment-${toKebabCase(name)}`;
                        const fieldInfoClass = getFieldInfoClass(elem, type, name);

                        const baseElemProps: TFieldElemProps = {
                            id: fieldId,
                            name,
                            autoComplete,
                            onChange: handleFieldChange,
                            disabled: isFormLocked
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
                        
                            return (
                                <input
                                    {...baseElemProps}
                                    type={type}
                                    maxLength={maxLength}
                                    placeholder={placeholder}
                                    value={getStringValue(fieldsState[name]?.value)}
                                    onKeyDown={handleFieldKeyDown}
                                    onBlur={trim ? handleFieldBlur : undefined}
                                />
                            );
                        })();

                        return (
                            <div key={fieldId} className={cn('form-entry', fieldInfoClass)}>
                                <label htmlFor={fieldId} className="form-entry-label">{label}:</label>

                                <div className={cn('form-entry-field', fieldsState[name]?.uiStatus)}>
                                    {name === 'amount' && (
                                        <button
                                            type="button"
                                            className="calc-remaining-amount-btn"
                                            title="Рассчитать оставшуюся для оплаты заказа сумму"
                                            onClick={calcRemainingAmount}
                                            disabled={isFormLocked}
                                        >
                                            ∑
                                        </button>
                                    )}

                                    {fieldElem}
                                    
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
                    reloadData={onCheckoutReload}
                />
            </form>
        </div>
    );
}
