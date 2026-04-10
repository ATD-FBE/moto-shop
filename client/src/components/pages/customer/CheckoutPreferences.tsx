import React, { useReducer, useState, useRef, useMemo, useEffect } from 'react';
import cn from 'classnames';
import { useAppSelector, useAppDispatch } from '@/hooks/storeHooks.js';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import Collapsible from '@/components/common/Collapsible.jsx';
import FormFooter from '@/components/common/FormFooter.jsx';
import {
    sendAuthCheckoutPrefsRequest,
    sendAuthCheckoutPrefsUpdateRequest
} from '@/api/authRequests.js';
import { setIsNavigationBlocked } from '@/redux/slices/uiSlice.js';
import { FORM_STATUS, BASE_SUBMIT_STATES, FIELD_UI_STATUS, SUCCESS_DELAY } from '@/config/constants.js';
import {
    getLockedStatuses,
    extractFieldConfigs,
    extendFieldConfigs,
    createFieldConfigMap,
    createInitFieldsState,
    fieldsStateReducer
} from '@/helpers/formHelpers.js';
import { toKebabCase, getFieldInfoClass } from '@/helpers/textHelpers.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import { validationRules, fieldErrorMessages, DEFAULT_FIELD_ERROR_MESSAGE } from '@shared/fieldRules.js';
import { DELIVERY_METHOD, DELIVERY_METHOD_OPTIONS, PAYMENT_METHOD_OPTIONS } from '@shared/constants.js';
import type {
    IGetSubmitStatesResult,
    TFormStatus,
    TSubmitStates,
    IFieldState,
    TFieldsState,
    TFieldValue,
    IProcessFormFieldsResult
} from '@/types/index.js';
import type {
    TDeliveryMethod,
    TEntityField,
    IAuthCheckoutPrefsUpdateBody
} from '@shared/types/index.js';

const getSubmitStates = (): IGetSubmitStatesResult => {
    const base = BASE_SUBMIT_STATES;
    const {
        DEFAULT, LOADING, LOAD_ERROR, BAD_REQUEST, NOT_FOUND,
        UNCHANGED, INVALID, ERROR, TIMEOUT, SUCCESS
    } = FORM_STATUS;
    const actionLabel = 'Сохранить';

    const submitStates: TSubmitStates = {
        ...base,
        [DEFAULT]: { submitBtnLabel: actionLabel },
        [LOADING]: { ...base[LOADING], mainMessage: 'Загрузка настроек заказа...' },
        [LOAD_ERROR]: { ...base[LOAD_ERROR], mainMessage: 'Не удалось загрузить настройки заказа.' },
        [BAD_REQUEST]: { ...base[BAD_REQUEST], submitBtnLabel: actionLabel },
        [NOT_FOUND]: {
            ...base[NOT_FOUND],
            mainMessage: 'Исходные настройки заказа или связанные с ними ресурсы не найдены.'
        },
        [UNCHANGED]: {
            ...base[UNCHANGED],
            addMessage: 'Настройки заказа не изменены.',
            submitBtnLabel: actionLabel
        },
        [INVALID]: { ...base[INVALID], submitBtnLabel: actionLabel },
        [ERROR]: { ...base[ERROR], submitBtnLabel: actionLabel },
        [TIMEOUT]: { ...base[TIMEOUT], submitBtnLabel: actionLabel },
        [SUCCESS]: {
            ...base[SUCCESS],
            mainMessage: 'Настройки заказа сохранены!',
            submitBtnLabel: 'Сохранено'
        }
    } as const;

    const lockedStatuses = getLockedStatuses(submitStates);

    return { submitStates, lockedStatuses };
};

const { submitStates, lockedStatuses } = getSubmitStates();

const isDeliveryRequired = ({ deliveryMethod }: { deliveryMethod: TDeliveryMethod }): boolean =>
    deliveryMethod && deliveryMethod !== DELIVERY_METHOD.SELF_PICKUP;

const formGroupConfigs = [
    {
        name: 'customerGroup',
        title: 'Основные данные покупателя',
        fieldConfigs: [
            {
                name: 'firstName',
                label: 'Имя',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите имя покупателя',
                trim: true,
                optional: true
            },
            {
                name: 'lastName',
                label: 'Фамилия',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите фамилию покупателя',
                trim: true,
                optional: true
            },
            {
                name: 'middleName',
                label: 'Отчество',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите отчество покупателя, если есть',
                trim: true,
                optional: true
            },
            {
                name: 'email',
                label: 'Email',
                elem: 'input',
                type: 'email',
                placeholder: 'Укажите почтовый ящик',
                trim: true,
                optional: true
            },
            {
                name: 'phone',
                label: 'Телефон (РФ)',
                elem: 'input',
                type: 'tel',
                placeholder: 'Укажите номер телефона',
                trim: true,
                optional: true
            },
        ]
    },
    {
        name: 'deliveryGroup',
        title: 'Информация для доставки заказа',
        fieldConfigs: [
            {
                name: 'deliveryMethod',
                label: 'Метод доставки',
                elem: 'select',
                options: [
                    { value: '', label: '--- Выбрать метод доставки ---' },
                    ...DELIVERY_METHOD_OPTIONS
                ],
                optional: true
            },
            {
                name: 'allowCourierExtra',
                label: 'Курьер-экстра',
                elem: 'checkbox',
                checkboxLabel: 'Выбрать дополнительную услугу курьера',
                tooltip:
                    'При удалении свыше 10 км от магазина возможен выезд курьера с доплатой. ' +
                    'Стоимость рассчитывается индивидуально.',
                canApply: ({ deliveryMethod }: { deliveryMethod: TDeliveryMethod }): boolean =>
                    deliveryMethod === DELIVERY_METHOD.COURIER
            },
            {
                name: 'region',
                label: 'Область/Регион',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите полное название региона',
                trim: true,
                optional: true,
                canApply: isDeliveryRequired
            },
            {
                name: 'district',
                label: 'Район',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите район',
                trim: true,
                optional: true,
                canApply: isDeliveryRequired
            },
            {
                name: 'city',
                label: 'Город',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите город',
                trim: true,
                optional: true,
                canApply: isDeliveryRequired
            },
            {
                name: 'street',
                label: 'Улица',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите улицу',
                trim: true,
                optional: true,
                canApply: isDeliveryRequired
            },
            {
                name: 'house',
                label: 'Дом',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите номер дома',
                trim: true,
                optional: true,
                canApply: isDeliveryRequired
            },
            {
                name: 'apartment',
                label: 'Квартира',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите номер квартиры',
                trim: true,
                optional: true,
                canApply: isDeliveryRequired
            },
            {
                name: 'postalCode',
                label: 'Почтовый индекс',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите почтовый индекс',
                trim: true,
                optional: true,
                canApply: isDeliveryRequired
            }
        ]
    },
    {
        name: 'paymentGroup',
        title: 'Выбор способа оплаты',
        fieldConfigs: [
            {
                name: 'defaultPaymentMethod',
                label: 'Способ оплаты',
                elem: 'select',
                options: [
                    { value: '', label: '--- Выбрать способ оплаты ---' },
                    ...PAYMENT_METHOD_OPTIONS
                ],
                optional: true
            }
        ]
    }
] as const;

const fieldConfigs = extendFieldConfigs(extractFieldConfigs(formGroupConfigs));

// Локальная типизация конфигов полей
type TFieldConfigs = typeof fieldConfigs;
type TFieldConfig = TFieldConfigs[number];
type TFieldName = TFieldConfig['name'];

// Проверка наличия полей конфига в наборе полей сущности
type TAuthEntityFields = TEntityField<'checkout'>;
type TValidFieldName = Extract<TFieldName, TAuthEntityFields>;

// Создание карты и начального состояния полей
const fieldConfigMap = createFieldConfigMap<TValidFieldName, TFieldConfig>(fieldConfigs);
const initFieldsState = createInitFieldsState<TValidFieldName>(fieldConfigs);
 
export default function CheckoutPreferences(): React.JSX.Element {
    const user = useAppSelector(state => state.auth.user);

    const [fieldsState, dispatchFieldsState] = useReducer(fieldsStateReducer, initFieldsState);
    const [submitStatus, setSubmitStatus] = useState<TFormStatus>(FORM_STATUS.LOADING);

    const initValuesRef = useRef<Partial<Record<TValidFieldName, TFieldValue>>>({});
    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();

    const deliveryMethodVal = fieldsState.deliveryMethod.value as TDeliveryMethod;

    const applicabilityMap = useMemo(
        () => Object.fromEntries(
            fieldConfigs.map(cfg => [
                cfg.name,
                typeof cfg.canApply === 'function'
                    ? cfg.canApply({ deliveryMethod: deliveryMethodVal })
                    : true
            ])
        ) as Record<TValidFieldName, boolean>,
        [deliveryMethodVal]
    );

    const isFormLocked = lockedStatuses.has(submitStatus);

    const loadCheckoutPrefs = async (): Promise<void> => {
        setSubmitStatus(FORM_STATUS.LOADING);

        const responseData = await dispatch(sendAuthCheckoutPrefsRequest());
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        logRequestStatus({ context: 'AUTH: LOAD CHECKOUT PREFS', status, message });

        if (status !== FORM_STATUS.SUCCESS) {
            const finalStatus = lockedStatuses.has(status) ? status : FORM_STATUS.LOAD_ERROR;
            return setSubmitStatus(finalStatus);
        }

        const { checkoutPrefs } = responseData;
        const { customerInfo, delivery, financials } = checkoutPrefs ?? {};
        const { firstName, lastName, middleName, email, phone } = customerInfo ?? {};
        const { deliveryMethod, allowCourierExtra, shippingAddress } = delivery ?? {};
        const { region, district, city, street, house, apartment, postalCode } = shippingAddress ?? {};
        const { defaultPaymentMethod } = financials ?? {};

        initValuesRef.current = {
            ...(firstName && { firstName }),
            ...(lastName && { lastName }),
            ...(middleName && { middleName }),
            ...(email && { email }),
            ...(phone && { phone }),
            ...(deliveryMethod && { deliveryMethod }),
            allowCourierExtra: allowCourierExtra ?? false,
            ...(region && { region }),
            ...(district && { district }),
            ...(city && { city }),
            ...(street && { street }),
            ...(house && { house }),
            ...(apartment && { apartment }),
            ...(postalCode && { postalCode }),
            ...(defaultPaymentMethod && { defaultPaymentMethod })
        };

        const initValues = initValuesRef.current;
        const initValuesEntries = Object.entries(initValues) as [TValidFieldName, TFieldValue][];

        if (initValuesEntries.length > 0) {
            dispatchFieldsState({
                type: 'UPDATE',
                payload: Object.fromEntries(
                    initValuesEntries.map(([key, value]) => ([key, { value }]))
                ) as Record<TValidFieldName, { value?: TFieldValue }>
            });
        }
        
        setSubmitStatus(FORM_STATUS.DEFAULT);
    };

    const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { type, name, value } = e.target;
        const checked = e.target instanceof HTMLInputElement && e.target.checked;
        const processedValue = type === 'checkbox' ? checked : value;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: processedValue, uiStatus: '', error: '' } }
        });
    };

    const handleTrimmedFieldBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        const normalizedValue = value.trim();
        if (normalizedValue === value) return;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: normalizedValue } }
        });
    };

    const fillRegistrationEmail = () => {
        if (!user) return;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { email: { value: user.email, uiStatus: '', error: '' } }
        });
    };

    const processFormFields = (): IProcessFormFieldsResult<
        TValidFieldName,
        IAuthCheckoutPrefsUpdateBody
    > => {
        const result = (Object.entries(fieldsState) as [TValidFieldName, IFieldState][]).reduce(
            (acc, [name, { value }]) => {
                const isApplicable = applicabilityMap[name];
                if (!isApplicable) return acc;
                
                const validation = validationRules.checkout[name];
                if (!validation) {
                    console.error(`Отсутствует правило валидации для поля: ${name}`);
                    return acc;
                }

                const { trim, optional } = fieldConfigMap[name] ?? {};
                const normalizedValue = typeof value === 'string' && trim ? value.trim() : value;

                const ruleCheck =
                    typeof validation === 'function'
                        ? (validation as (val: typeof normalizedValue) => boolean)(normalizedValue)
                        : typeof normalizedValue === 'string' 
                            ? validation.test(normalizedValue) 
                            : false;
                const isValid = optional
                    ? (normalizedValue === undefined || normalizedValue === '' || ruleCheck)
                    : ruleCheck;

                acc.fieldsStateUpdates[name] = {
                    value: normalizedValue,
                    uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
                    error: isValid
                        ? ''
                        : fieldErrorMessages.checkout[name].default || DEFAULT_FIELD_ERROR_MESSAGE
                };
        
                if (isValid) {
                    if (normalizedValue !== undefined && normalizedValue !== '') {
                        type TFieldsCollector = Record<TValidFieldName, typeof normalizedValue>;
                        (acc.formFields as TFieldsCollector)[name] = normalizedValue;
                    }

                    const initValue = initValuesRef.current[name] ?? '';
                    if (normalizedValue !== initValue) acc.changedFields.push(name);
                } else {
                    acc.allValid = false;
                }
        
                return acc;
            },
            {
                allValid: true,
                fieldsStateUpdates: {} as TFieldsState<TValidFieldName>,
                formFields: {} as IAuthCheckoutPrefsUpdateBody,
                changedFields: [] as TValidFieldName[]
            }
        );
    
        return result;
    };
    
    const handleFormSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault();

        const { allValid, fieldsStateUpdates, formFields, changedFields = [] } = processFormFields();
        
        dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

        if (!allValid) {
            return setSubmitStatus(FORM_STATUS.INVALID);
        } else if (!changedFields.length) {
            return setSubmitStatus(FORM_STATUS.UNCHANGED);
        }

        setSubmitStatus(FORM_STATUS.SENDING);
        dispatch(setIsNavigationBlocked(true));

        const responseData = await dispatch(sendAuthCheckoutPrefsUpdateRequest(formFields));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        const LOG_CTX = 'AUTH: UPDATE CHECKOUT PREFS';

        switch (status) {
            case FORM_STATUS.UNAUTH:
            case FORM_STATUS.USER_GONE:
            case FORM_STATUS.DENIED:
            case FORM_STATUS.BAD_REQUEST:
            case FORM_STATUS.UNCHANGED:
            case FORM_STATUS.ERROR:
            case FORM_STATUS.TIMEOUT:
                logRequestStatus({ context: LOG_CTX, status, message });
                setSubmitStatus(status);
                dispatch(setIsNavigationBlocked(false));
                break;

            case FORM_STATUS.INVALID: {
                const { fieldErrors } = responseData;
                logRequestStatus({ context: LOG_CTX, status, message, details: fieldErrors });

                const fieldsStateUpdates: Partial<TFieldsState<TValidFieldName>> = {};
                (Object.entries(fieldErrors) as [TValidFieldName, string][]).forEach(([name, error]) => {
                    if (name in fieldConfigMap) {
                        fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.INVALID, error };
                    }
                });
                dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

                setSubmitStatus(status);
                dispatch(setIsNavigationBlocked(false));
                break;
            }
        
            case FORM_STATUS.SUCCESS: {
                logRequestStatus({ context: LOG_CTX, status, message });

                // Обновление начальных значений полей
                initValuesRef.current = Object.fromEntries(
                    Object.entries(fieldsState)
                        .map(([key, { value }]) => ([key, value]))
                        .filter(([_, value]) => Boolean(value))
                );

                const fieldsStateUpdates: Partial<TFieldsState<TValidFieldName>> = {};
                fieldConfigs.forEach(({ name }) => {
                    if (name in fieldConfigMap) {
                        fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.CHANGED, error: '' };
                    }
                });
                dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

                setSubmitStatus(status);

                setTimeout(() => {
                    if (isUnmountedRef.current) return;

                    changedFields.forEach(name => {
                        fieldsStateUpdates[name] = { uiStatus: '', error: '' };
                    });
                    dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

                    setSubmitStatus(FORM_STATUS.DEFAULT);
                    dispatch(setIsNavigationBlocked(false));
                }, SUCCESS_DELAY);
                break;
            }
        
            default:
                logRequestStatus({ context: LOG_CTX, status, message, unhandled: true });
                setSubmitStatus(FORM_STATUS.UNKNOWN);
                dispatch(setIsNavigationBlocked(false));
                break;
        }
    };

    // Стартовая загрузка настроек заказа и очистка при размонтировании
    useEffect(() => {
        loadCheckoutPrefs();

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
        <div className="checkout-preferences-page">
            <header className="checkout-preferences-header">
                <h2>Настройки заказа</h2>
                <p>Данные будут использоваться по умолчанию при оформлении заказа</p>
            </header>

            <form className="checkout-preferences-form" onSubmit={handleFormSubmit} noValidate>
                <div className="form-body">
                    {formGroupConfigs.map(({ name, title, fieldConfigs }) => (
                        <div key={name} className={cn('form-group', toKebabCase(name))}>
                            <div className="form-group-title">
                                <h4>{title}</h4>
                            </div>

                            <FormGroupEntries
                                fieldConfigs={fieldConfigs}
                                fieldsState={fieldsState}
                                applicabilityMap={applicabilityMap}
                                handleFieldChange={handleFieldChange}
                                handleTrimmedFieldBlur={handleTrimmedFieldBlur}
                                isFormLocked={isFormLocked}
                                fillRegistrationEmail={fillRegistrationEmail}
                            />
                        </div>
                    ))}
                </div>

                <FormFooter
                    submitStates={submitStates}
                    submitStatus={submitStatus}
                    uiBlocked={isFormLocked}
                    reloadData={loadCheckoutPrefs}
                />
            </form>
        </div>
    );
}

interface FormGroupEntriesProps {
    fieldConfigs: TFieldConfigs;
    fieldsState: TFieldsState<TValidFieldName>;
    applicabilityMap: Record<TValidFieldName, boolean>;
    isFormLocked: boolean;
    handleFieldChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    handleTrimmedFieldBlur: (e: React.FocusEvent<HTMLInputElement>) => void;
    fillRegistrationEmail: () => void;
}

function FormGroupEntries({
    fieldConfigs,
    fieldsState,
    applicabilityMap,
    isFormLocked,
    handleFieldChange,
    handleTrimmedFieldBlur,
    fillRegistrationEmail
}: FormGroupEntriesProps): React.JSX.Element {
    return (
        <div className="form-group-entries">
            {fieldConfigs.map(({
                name,
                label,
                elem,
                type,
                options,
                placeholder,
                checkboxLabel,
                tooltip,
                trim,
                canApply
            }) => {
                const fieldId = `checkout-${toKebabCase(name)}`;
                const fieldInfoClass = getFieldInfoClass(elem, type, name);
                const isApplicable = applicabilityMap[name];
                const isCollapsible = !!canApply;

                const baseProps = {
                    id: fieldId,
                    name,
                    autoComplete: 'off',
                    disabled: isFormLocked || !isApplicable,
                    onChange: handleFieldChange,
                };

                let fieldElem: React.JSX.Element;

                if (elem === 'select') {
                    fieldElem = (
                        <select
                            {...baseProps}
                            value={(fieldsState[name]?.value ?? '') as string}
                        >
                            {options.map((option, idx) => (
                                <option key={`${idx}-${option.value}`} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    );
                } else if (elem === 'checkbox') {
                    fieldElem = (
                        <DesignedCheckbox
                            {...baseProps}
                            label={checkboxLabel}
                            checked={(fieldsState[name]?.value ?? false) as boolean}
                        />
                    );
                } else {
                    fieldElem = (
                        <input
                            {...baseProps}
                            type={type}
                            placeholder={placeholder}
                            value={(fieldsState[name]?.value ?? '') as string}
                            onBlur={trim ? handleTrimmedFieldBlur : undefined}
                        />
                    );
                }

                const formEntryElem = (
                    <div key={`field-${name}`} className={cn('form-entry', fieldInfoClass)}>
                        <label htmlFor={fieldId} className="form-entry-label">
                            {label}
                            {tooltip && <span className="info" title={tooltip}>ⓘ</span>}
                            :
                        </label>

                        <div className={cn('form-entry-field', fieldsState[name]?.uiStatus)}>
                            {name === 'email' && (
                                <button
                                    type="button"
                                    className="auto-fill-email-btn"
                                    title="Вставить email, указанный при регистрации"
                                    onClick={fillRegistrationEmail}
                                    disabled={isFormLocked}
                                >
                                    📧
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

                if (isCollapsible) {
                    return (
                        <Collapsible
                            key={`field-${name}`}
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
    );
}
