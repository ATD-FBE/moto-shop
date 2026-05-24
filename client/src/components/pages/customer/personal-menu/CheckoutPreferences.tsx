import { useReducer, useState, useRef, useMemo, useEffect } from 'react';
import cn from 'classnames';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import Collapsible from '@/components/common/Collapsible.jsx';
import FormFooter from '@/components/common/FormFooter.jsx';
import { useAppSelector, useAppDispatch } from '@/hooks/storeHooks.js';
import {
    sendAuthCheckoutPrefsRequest,
    sendAuthCheckoutPrefsUpdateRequest
} from '@/api/authRequests.js';
import { setNavigationLock } from '@/redux/slices/uiSlice.js';
import {
    FORM_STATUS,
    BASE_SUBMIT_STATES,
    FIELD_UI_STATUS,
    SUCCESS_DELAY
} from '@/config/constants.js';
import {
    getLockedStatuses,
    extractFieldConfigs,
    extendFieldConfigs,
    createFieldConfigMap,
    createInitialFieldsState,
    fieldsStateReducer,
    getStringValue,
    getBoolValue
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
    DELIVERY_METHOD,
    DELIVERY_METHOD_OPTIONS,
    PAYMENT_METHOD_OPTIONS
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
    IFormGroupConfig,
    TFormStatus,
    TSubmitStates,
    TFieldStateValue,
    TFieldApiValue,
    IFieldState,
    TFormState,
    IProcessFormFieldsResult
} from '@/types/index.js';
import type {
    TDeliveryMethod,
    TEntityField,
    IAuthCheckoutPrefsUpdateBody
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TFieldConfigs = typeof fieldConfigs;
type TFieldConfig = TFieldConfigs[number];
type TFieldName = Extract<TFieldConfig['name'], TEntityField<'checkout'>>;

type TInitFieldValues = Record<TFieldName, TFieldApiValue>;
type TFieldsStateUpdates = Partial<Record<TFieldName, Partial<IFieldState>>>;

type TApiFormFields = {
    [K in keyof IAuthCheckoutPrefsUpdateBody]: TFieldApiValue;
};

interface IFormGroupEntriesProps {
    fieldConfigs: TFieldConfigs;
    fieldsState: TFormState<TFieldName>;
    applicabilityMap: Record<TFieldName, boolean>;
    isFormLocked: boolean;
    handleFieldChange: (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => void;
    handleFieldBlur: (e: FocusEvent<HTMLInputElement>) => void;
    fillRegistrationEmail: () => void;
}

type TFieldElemProps =
    InputHTMLAttributes<HTMLInputElement> &
    SelectHTMLAttributes<HTMLSelectElement>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

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
    };

    const lockedStatuses = getLockedStatuses(submitStates);

    return { submitStates, lockedStatuses };
};

const { submitStates, lockedStatuses } = getSubmitStates();

const isAddressDelivery = ({ deliveryMethod }: { deliveryMethod: TDeliveryMethod | '' }): boolean =>
    !!deliveryMethod && deliveryMethod !== DELIVERY_METHOD.SELF_PICKUP;

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
                canApply: isAddressDelivery
            },
            {
                name: 'district',
                label: 'Район',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите район',
                trim: true,
                optional: true,
                canApply: isAddressDelivery
            },
            {
                name: 'city',
                label: 'Город',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите город',
                trim: true,
                optional: true,
                canApply: isAddressDelivery
            },
            {
                name: 'street',
                label: 'Улица',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите улицу',
                trim: true,
                optional: true,
                canApply: isAddressDelivery
            },
            {
                name: 'house',
                label: 'Дом',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите номер дома',
                trim: true,
                optional: true,
                canApply: isAddressDelivery
            },
            {
                name: 'apartment',
                label: 'Квартира',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите номер квартиры',
                trim: true,
                optional: true,
                canApply: isAddressDelivery
            },
            {
                name: 'postalCode',
                label: 'Почтовый индекс',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите почтовый индекс',
                trim: true,
                optional: true,
                canApply: isAddressDelivery
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
] as const satisfies readonly IFormGroupConfig[];

const fieldConfigs = extendFieldConfigs(extractFieldConfigs(formGroupConfigs));
const fieldConfigMap = createFieldConfigMap<TFieldName, TFieldConfig>(fieldConfigs);
const initialFieldsState = createInitialFieldsState<TFieldName>(fieldConfigs);
 
export default function CheckoutPreferences(): JSX.Element {
    const user = useAppSelector(state => state.auth.user);

    const [fieldsState, dispatchFieldsState] = useReducer(fieldsStateReducer, initialFieldsState);
    const [submitStatus, setSubmitStatus] = useState<TFormStatus>(FORM_STATUS.LOADING);

    const initFieldValuesRef = useRef<TInitFieldValues>({} as TInitFieldValues);
    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();

    const deliveryMethod = fieldsState.deliveryMethod.value as TDeliveryMethod | '';

    const applicabilityMap = useMemo(
        () => Object.fromEntries(
            fieldConfigs.map(cfg => [
                cfg.name,
                typeof cfg.canApply === 'function' ? cfg.canApply({ deliveryMethod }) : true
            ])
        ) as Record<TFieldName, boolean>,
        [deliveryMethod]
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

        initFieldValuesRef.current = {
            firstName: firstName ?? '',
            lastName: lastName ?? '',
            middleName: middleName ?? '',
            email: email ?? '',
            phone: phone ?? '',
            deliveryMethod: deliveryMethod ?? '',
            allowCourierExtra: allowCourierExtra ?? false,
            region: region ?? '',
            district: district ?? '',
            city: city ?? '',
            street: street ?? '',
            house: house ?? '',
            apartment: apartment ?? '',
            postalCode: postalCode ?? '',
            defaultPaymentMethod: defaultPaymentMethod ?? ''
        };

        dispatchFieldsState({
            type: 'UPDATE',
            payload: Object.fromEntries(
                Object.entries(initFieldValuesRef.current).map(([name, value]) => ([name, { value }]))
            )
        });
        
        setSubmitStatus(FORM_STATUS.DEFAULT);
    };

    const handleFieldChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
        const target = e.currentTarget;
        const { name, type, value } = target;
        if (!isObjectKey(name, fieldConfigMap)) return;

        const checked = 'checked' in target ? target.checked : false;
        const processedValue = type === 'checkbox' ? checked : value;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: processedValue, uiStatus: '', error: '' } }
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

    const fillRegistrationEmail = (): void => {
        if (!user) return;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { email: { value: user.email, uiStatus: '', error: '' } }
        });
    };

    const processFormFields = (): IProcessFormFieldsResult<
        TFieldName,
        IAuthCheckoutPrefsUpdateBody
    > => {
        const result = (Object.entries(fieldsState) as [TFieldName, IFieldState][]).reduce(
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
                        ? validation(normalizedValue)
                        : typeof normalizedValue === 'string' 
                            ? validation.test(normalizedValue) 
                            : false;

                const hasValue = normalizedValue !== '';
                const isValid = optional ? (!hasValue || ruleCheck) : ruleCheck;

                acc.fieldsStateUpdates[name] = {
                    value: normalizedValue,
                    uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
                    error: isValid
                        ? ''
                        : fieldErrorMessages.checkout[name].default || DEFAULT_FIELD_ERROR_MESSAGE
                };
        
                if (isValid) {
                    if (hasValue) {
                        (acc.formFields as TApiFormFields)[name] = normalizedValue;
                    }

                    const initValue = initFieldValuesRef.current[name];
                    if (normalizedValue !== initValue) acc.changedFields.push(name);
                } else {
                    acc.allValid = false;
                }
        
                return acc;
            },
            {
                allValid: true,
                fieldsStateUpdates: {} as TFieldsStateUpdates,
                formFields: {} as IAuthCheckoutPrefsUpdateBody,
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

                // Обновление начальных значений полей
                initFieldValuesRef.current = Object.fromEntries(
                    (Object.entries(fieldsState) as [TFieldName, IFieldState][])
                        .map(([key, { value }]) => ([key, value]))
                ) as Record<TFieldName, TFieldStateValue>;

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

        const isErrorField = Object.values(fieldsState).some(state => Boolean(state.error));
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
                                handleFieldBlur={handleFieldBlur}
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

function FormGroupEntries({
    fieldConfigs,
    fieldsState,
    applicabilityMap,
    isFormLocked,
    handleFieldChange,
    handleFieldBlur,
    fillRegistrationEmail
}: IFormGroupEntriesProps): JSX.Element {
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

                const baseElemProps: TFieldElemProps = {
                    id: fieldId,
                    name,
                    autoComplete: 'off',
                    onChange: handleFieldChange,
                    disabled: isFormLocked || !isApplicable,
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
                            placeholder={placeholder}
                            value={getStringValue(fieldsState[name]?.value)}
                            onBlur={trim ? handleFieldBlur : undefined}
                        />
                    );
                })();

                const formEntryElem = (
                    <div key={fieldId} className={cn('form-entry', fieldInfoClass)}>
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
    );
}
