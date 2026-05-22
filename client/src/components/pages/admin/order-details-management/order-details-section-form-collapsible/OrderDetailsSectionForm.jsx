import React, { useMemo, useReducer, useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import cn from 'classnames';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import Collapsible from '@/components/common/Collapsible.jsx';
import FormFooter from '@/components/common/FormFooter.jsx';
import { sendOrderDetailsUpdateRequest, sendOrderItemsUpdateRequest } from '@/api/orderRequests.js';
import { setNavigationLock } from '@/redux/slices/uiSlice.js';
import { formatOrderAdjustmentLogs } from '@/services/orderService.js';
import { openAlertModal } from '@/services/modalAlertService.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { toKebabCase, getFieldInfoClass, formatCurrency } from '@/helpers/textHelpers.js';
import {
    ORDER_DETAILS_EDIT_SECTION,
    FORM_STATUS,
    BASE_SUBMIT_STATES,
    FIELD_UI_STATUS,
    SUCCESS_DELAY
} from '@/config/constants.js';
import { validationRules, fieldErrorMessages } from '@shared/fieldRules.js';
import {
    MIN_ORDER_AMOUNT,
    DELIVERY_METHOD,
    DELIVERY_METHOD_OPTIONS,
    PAYMENT_METHOD_OPTIONS
} from '@shared/constants.js';

const getSubmitStates = () => {
    const base = BASE_SUBMIT_STATES;
    const {
        DEFAULT, BAD_REQUEST, NOT_FOUND, UNCHANGED, LIMITATION,
        MODIFIED, INVALID, ERROR, TIMEOUT, SUCCESS
    } = FORM_STATUS;
    const actionLabel = 'Сохранить';

    const submitStates = {
        ...base,
        [DEFAULT]: { submitBtnLabel: actionLabel },
        [BAD_REQUEST]: { ...base[BAD_REQUEST], submitBtnLabel: actionLabel },
        [NOT_FOUND]: {
            ...base[NOT_FOUND],
            mainMessage: 'Исходный заказ или связанный с ним ресурс не найден.'
        },
        [UNCHANGED]: {
            ...base[UNCHANGED],
            addMessage: 'Данные заказа не изменены.',
            submitBtnLabel: actionLabel
        },
        [INVALID]: { ...base[INVALID], submitBtnLabel: actionLabel },
        [LIMITATION]: { ...base[LIMITATION], submitBtnLabel: actionLabel, locked: false },
        [MODIFIED]: {
            ...base[MODIFIED],
            mainMessage: 'Заказ не изменён.',
            addMessage: 'Обнаружены корректировки.',
            submitBtnLabel: actionLabel
        },
        [ERROR]: { ...base[ERROR], submitBtnLabel: actionLabel },
        [TIMEOUT]: { ...base[TIMEOUT], submitBtnLabel: actionLabel },
        [SUCCESS]: {
            ...base[SUCCESS],
            mainMessage: 'Данные заказа обновлены!',
            submitBtnLabel: 'Сохранено'
        }
    };

    const lockedStatuses = Object.entries(submitStates)
        .map(([status, state]) => state.locked && status)
        .filter(Boolean);

    return { submitStates, lockedStatuses: new Set(lockedStatuses) };
};

const { submitStates, lockedStatuses } = getSubmitStates();

const isDeliveryRequired = (deliveryMethod) =>
    deliveryMethod && deliveryMethod !== DELIVERY_METHOD.SELF_PICKUP;

const getFieldConfigs = (section) => {
    const baseFieldConfigsBySection = {
        [ORDER_DETAILS_EDIT_SECTION.CUSTOMER_INFO]: [
            {
                name: 'firstName',
                label: 'Имя',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите имя покупателя',
                trim: true
            },
            {
                name: 'lastName',
                label: 'Фамилия',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите фамилию покупателя',
                trim: true
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
                type: 'text', // Чтобы срабатывали изменения для пробелов в начале и конце
                placeholder: 'Укажите почтовый ящик',
                trim: true
            },
            {
                name: 'phone',
                label: 'Телефон',
                elem: 'input',
                type: 'tel',
                placeholder: 'Укажите номер телефона',
                trim: true
            }
        ],
        [ORDER_DETAILS_EDIT_SECTION.DELIVERY]: [
            {
                name: 'deliveryMethod',
                label: 'Метод доставки',
                elem: 'select',
                options: [
                    { value: '', label: '--- Выбрать метод доставки ---' },
                    ...DELIVERY_METHOD_OPTIONS
                ],
                relatedFields: [
                    'allowCourierExtra', 'region', 'district', 'city',
                    'street', 'house', 'apartment', 'postalCode'
                ]
            },
            {
                name: 'allowCourierExtra',
                label: 'Курьер-экстра',
                elem: 'checkbox',
                checkboxLabel: 'Выбрать дополнительную услугу курьера',
                tooltip:
                    'При удалении свыше 10 км от магазина возможен выезд курьера с доплатой. ' +
                    'Стоимость рассчитывается индивидуально.',
                canApply: ({ deliveryMethod }) => deliveryMethod === DELIVERY_METHOD.COURIER
            },
            {
                name: 'region',
                label: 'Область/Регион',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите полное название региона',
                trim: true,
                optional: true,
                canApply: ({ deliveryMethod }) => isDeliveryRequired(deliveryMethod)
            },
            {
                name: 'district',
                label: 'Район',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите район',
                trim: true,
                optional: true,
                canApply: ({ deliveryMethod }) => isDeliveryRequired(deliveryMethod)
            },
            {
                name: 'city',
                label: 'Город',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите город',
                trim: true,
                canApply: ({ deliveryMethod }) => isDeliveryRequired(deliveryMethod)
            },
            {
                name: 'street',
                label: 'Улица',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите улицу',
                trim: true,
                canApply: ({ deliveryMethod }) => isDeliveryRequired(deliveryMethod)
            },
            {
                name: 'house',
                label: 'Дом',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите номер дома',
                trim: true,
                canApply: ({ deliveryMethod }) => isDeliveryRequired(deliveryMethod)
            },
            {
                name: 'apartment',
                label: 'Квартира',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите номер квартиры',
                trim: true,
                optional: true,
                canApply: ({ deliveryMethod }) => isDeliveryRequired(deliveryMethod)
            },
            {
                name: 'postalCode',
                label: 'Почтовый индекс',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите почтовый индекс',
                trim: true,
                optional: true,
                canApply: ({ deliveryMethod }) => isDeliveryRequired(deliveryMethod)
            }
        ],
        [ORDER_DETAILS_EDIT_SECTION.PAYMENT]: [
            {
                name: 'defaultPaymentMethod',
                label: 'Способ оплаты',
                elem: 'select',
                options: [
                    { value: '', label: '--- Выбрать способ оплаты ---' },
                    ...PAYMENT_METHOD_OPTIONS
                ]
            }
        ],
        [ORDER_DETAILS_EDIT_SECTION.ITEMS]: []
    };

    const editReasonConfig = {
        name: 'editReason',
        label: 'Причина изменения',
        elem: 'textarea',
        placeholder: 'Укажите причину изменения',
        trim: true
    };

    const fieldConfigs = [...baseFieldConfigsBySection[section], editReasonConfig];

    const fieldConfigMap = fieldConfigs.reduce((acc, config) => {
        acc[config.name] = config;
        return acc;
    }, {});

    return { fieldConfigs, fieldConfigMap };
};

const initFieldsStateReducer = (fieldConfigs) =>
    fieldConfigs.reduce((acc, { name }) => {
        acc[name] = { value: '', uiStatus: '', error: '' };
        return acc;
    }, {});

const fieldsStateReducer = (state, action) => {
    const { type, payload } = action;

    switch (type) {
        case 'UPDATE':
            const newState = { ...state };
            for (const name in payload) {
                newState[name] = { ...(state[name] ?? {}), ...payload[name] };
            }
            return newState;

        default:
            return state;
    }
};

export default function OrderDetailsSectionForm({
    section,
    order,
    itemsSubmitResult,
    setIsItemsSubmitting,
    onItemsResponseResult
}) {
    const { fieldConfigs, fieldConfigMap } = useMemo(() => getFieldConfigs(section), [section]);
    
    const [fieldsState, dispatchFieldsState] = useReducer(
        fieldsStateReducer,
        fieldConfigs,
        initFieldsStateReducer
    );
    const [submitStatus, setSubmitStatus] = useState(FORM_STATUS.DEFAULT);
    const initFieldValuesRef = useRef({});
    const isItemsSectionRef = useRef(section === ORDER_DETAILS_EDIT_SECTION.ITEMS);
    const isUnmountedRef = useRef(false);
    const dispatch = useDispatch();

    const deliveryMethod = fieldsState.deliveryMethod?.value || '';

    const applicabilityMap = useMemo(
        () => Object.fromEntries(
            fieldConfigs.map(cfg => [
                cfg.name,
                typeof cfg.canApply === 'function' ? cfg.canApply({ deliveryMethod }) : true
            ])
        ),
        [deliveryMethod]
    );

    const isFormLocked = lockedStatuses.has(submitStatus);

    const handleFieldChange = (e) => {
        const { type, name, value, checked } = e.currentTarget;
        const processedValue = type === 'checkbox' ? checked : value;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: processedValue, uiStatus: '', error: '' } }
        });
    };

    const handleFieldBlur = (e) => {
        const { name, value } = e.currentTarget;
        const normalizedValue = value.trim();
        if (normalizedValue === value) return;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: normalizedValue } }
        });
    };

    const processFormFields = () => {
        const result = Object.entries(fieldsState).reduce(
            (acc, [name, { value }]) => {
                const isApplicable = applicabilityMap[name];
                if (!isApplicable) {
                    return acc;
                }

                const validation = validationRules.order[name];
                if (!validation) {
                    console.error(`Отсутствует правило валидации для поля: ${name}`);
                    return acc;
                }

                const { trim, optional, relatedFields } = fieldConfigMap[name] ?? {};
                const normalizedValue = trim ? value.trim() : value;
                const ruleCheck =
                    typeof validation === 'function'
                        ? validation(normalizedValue)
                        : validation.test(normalizedValue);

                const isValid = optional ? (!normalizedValue || ruleCheck) : ruleCheck;

                acc.fieldsStateUpdates[name] = {
                    value: normalizedValue,
                    uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
                    error: isValid
                        ? ''
                        : fieldErrorMessages.order[name].default || fieldErrorMessages.DEFAULT
                };

                if (isValid) {
                    const initValue = initFieldValuesRef.current[name];

                    if (normalizedValue !== initValue) {
                        acc.formFields[name] = normalizedValue;
                        acc.changedFields.push(name);

                        relatedFields?.forEach(relFieldName => {
                            if (applicabilityMap[relFieldName]) {
                                acc.formFields[relFieldName] = fieldsState[relFieldName]?.value;
                            }
                        });
                        
                    }
                } else {
                    acc.allValid = false;
                }
        
                return acc;
            },
            { allValid: true, fieldsStateUpdates: {}, formFields: {}, changedFields: [] }
        );
    
        return result;
    };

    const handleFormSubmit = (e) => {
        e.preventDefault();

        if (isItemsSectionRef.current) {
            setIsItemsSubmitting(true);
        } else {
            const formFieldsResult = prepareFormFields();
            if (!formFieldsResult) return;
    
            const { formFields, changedFields } = formFieldsResult;
            performFormSubmission(formFields, changedFields);
        }
    };

    const handleItemsSectionFormSubmit = (itemsSubmitResult) => {
        if (!itemsSubmitResult.ok) {
            return setIsItemsSubmitting(false);
        }

        // Сбор и валиация полей общей формы (поле editReason для itemsSection)
        const formFieldsResult = prepareFormFields({
            changedItemsFields: itemsSubmitResult.changedFields
        });

        if (!formFieldsResult) {
            return setIsItemsSubmitting(false);
        }

        const { formFields, changedFields } = formFieldsResult;
        formFields.items = itemsSubmitResult.items;

        performFormSubmission(formFields, changedFields, itemsSubmitResult.changedFields);
    };

    const prepareFormFields = ({ changedItemsFields } = {}) => {
        const { allValid, fieldsStateUpdates, formFields, changedFields } = processFormFields();
        
        dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

        if (!allValid) {
            setSubmitStatus(FORM_STATUS.INVALID);
            return null;
        } else {
            if (isItemsSectionRef.current) {
                if (!changedItemsFields.length) {
                    setSubmitStatus(FORM_STATUS.UNCHANGED);
                    return null;
                }
            } else {
                const changedDbFields = changedFields.filter(f => f !== 'editReason');

                if (!changedDbFields.length) {
                    setSubmitStatus(FORM_STATUS.UNCHANGED);
                    return null;
                }
            }
        }

        return { formFields, changedFields };
    };

    const performFormSubmission = async (formFields, changedFields, changedItemsFields) => {
        setSubmitStatus(FORM_STATUS.SENDING);
        dispatch(setNavigationLock(true));

        const requestThunk = isItemsSectionRef.current
            ? sendOrderItemsUpdateRequest(order.id, formFields)
            : sendOrderDetailsUpdateRequest(order.id, formFields);
        const responseData = await dispatch(requestThunk);
        if (isUnmountedRef.current) return;

        const { status, message, orderItemAdjustments, fieldErrors } = responseData;
        const hasAdjustments = orderItemAdjustments?.length > 0;
        const LOG_CTX = 'ORDER: UPDATE';

        switch (status) {
            case FORM_STATUS.UNAUTH:
            case FORM_STATUS.USER_GONE:
            case FORM_STATUS.DENIED:
            case FORM_STATUS.BAD_REQUEST:
            case FORM_STATUS.NOT_FOUND:
            case FORM_STATUS.CONFLICT:
            case FORM_STATUS.UNCHANGED:
            case FORM_STATUS.ERROR:
            case FORM_STATUS.TIMEOUT:
                logRequestStatus({ context: LOG_CTX, status, message });
                if (isItemsSectionRef.current) setIsItemsSubmitting(false);
                setSubmitStatus(status);
                dispatch(setNavigationLock(false));
                break;

            // Секция items: сумма заказа меньше минимальной в результате изменения кол-ва товаров
            case FORM_STATUS.LIMITATION: {
                logRequestStatus({ context: LOG_CTX, status, message });
                setIsItemsSubmitting(false);
                setSubmitStatus(status);

                const minOrderAmountMsg =
                    'Сумма заказа после изменения количества товаров стала меньше минимальной.\n' +
                    'Минимальная сумма заказа — ' +
                    `<span className="color-blue">${formatCurrency(MIN_ORDER_AMOUNT)}</span> ₽. `;

                const adjustmentsMsg = hasAdjustments
                    ? '<span className="bold underline">' +
                        'Корректировки при изменении товаров в заказе:</span>\n\n' +
                        formatOrderAdjustmentLogs(orderItemAdjustments)
                    : '';

                openAlertModal({
                    openDelay: 1000,
                    type: 'error',
                    dismissible: false,
                    title: 'Сумма заказа меньше минимальной',
                    message: minOrderAmountMsg + (hasAdjustments ? `\n\n\n${adjustmentsMsg}` : ''),
                    onClose: () => dispatch(setNavigationLock(false))
                });
                break;
            }

            // Секция items: изменений в количестве товаров нет, имеются корректировки изменений
            case FORM_STATUS.MODIFIED: {
                logRequestStatus({ context: LOG_CTX, status, message });
                setIsItemsSubmitting(false);
                setSubmitStatus(status);

                onItemsResponseResult({ shouldRefreshItemsAvailability: true });

                openAlertModal({
                    openDelay: 1000,
                    type: 'warn',
                    dismissible: false,
                    title: 'Корректировки при изменении товаров в заказе',
                    message: formatOrderAdjustmentLogs(orderItemAdjustments),
                    onClose: () => dispatch(setNavigationLock(false))
                });
                break;
            }

            case FORM_STATUS.INVALID: {
                logRequestStatus({ context: LOG_CTX, status, message, details: fieldErrors });

                if (fieldErrors) {
                    const fieldsStateUpdates = {};
                    Object.entries(fieldErrors).forEach(([name, error]) => {
                        fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.INVALID, error };
                    });
                    dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });
                }

                if (isItemsSectionRef.current) {
                    onItemsResponseResult({ fieldErrors });
                    setIsItemsSubmitting(false);
                }

                setSubmitStatus(status);
                dispatch(setNavigationLock(false));
                break;
            }
        
            case FORM_STATUS.SUCCESS: {
                logRequestStatus({ context: LOG_CTX, status, message });

                const fieldsStateUpdates = {};
                changedFields.forEach(name => {
                    fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.CHANGED };
                });
                dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

                if (isItemsSectionRef.current) {
                    onItemsResponseResult({ changedFields: changedItemsFields });
                }
                setSubmitStatus(status);

                setTimeout(() => {
                    if (isUnmountedRef.current) return;

                    if (hasAdjustments) {
                        openAlertModal({
                            type: 'warn',
                            dismissible: false,
                            title: 'Корректировки при изменении товаров в заказе',
                            message: formatOrderAdjustmentLogs(orderItemAdjustments),
                            onClose: () => dispatch(setNavigationLock(false))
                        });
                    }

                    changedFields.forEach(name => {
                        fieldsStateUpdates[name] = {
                            ...(name === 'editReason' && { value: '' }),
                            uiStatus: ''
                        };
                    });
                    dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

                    if (isItemsSectionRef.current) setIsItemsSubmitting(false);
                    setSubmitStatus(FORM_STATUS.DEFAULT);
                    dispatch(setNavigationLock(false));
                }, SUCCESS_DELAY);
                break;
            }
        
            default:
                logRequestStatus({ context: LOG_CTX, status, message, unhandled: true });
                if (isItemsSectionRef.current) setIsItemsSubmitting(false);
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

    // Установка начальных значений полей заказа после загрузки/апдейта заказа
    useEffect(() => {
        const { customerInfo, delivery, financials, customerComment } = order ?? {};
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
            defaultPaymentMethod: defaultPaymentMethod ?? '',
            customerComment: customerComment ?? '',
            editReason: ''
        };

        dispatchFieldsState({
            type: 'UPDATE',
            payload: Object.fromEntries(
                Object.entries(initFieldValuesRef.current).map(([name, value]) => ([name, { value }]))
            )
        });

        setSubmitStatus(FORM_STATUS.DEFAULT);
    }, [order]);

    // Сброс статуса формы при отсутствии ошибок полей
    useEffect(() => {
        if (submitStatus !== FORM_STATUS.INVALID) return;

        const isErrorField = Object.values(fieldsState).some(state => Boolean(state.error));
        if (!isErrorField) setSubmitStatus(FORM_STATUS.DEFAULT);
    }, [submitStatus, fieldsState]);

    // Отправка данных после обработки полей количества товара в заказе (для секции)
    useEffect(() => {
        if (!isItemsSectionRef.current) return;
        if (!itemsSubmitResult) return;

        handleItemsSectionFormSubmit(itemsSubmitResult);
    }, [itemsSubmitResult]);

    return (
        <form className="order-details-section-form" onSubmit={handleFormSubmit} noValidate>
            <div className="form-body">
                {fieldConfigs.map(({
                    name,
                    label,
                    elem,
                    type,
                    step,
                    min,
                    options,
                    placeholder,
                    checkboxLabel,
                    tooltip,
                    trim,
                    optional,
                    canApply
                }) => {
                    const fieldId = `order-details-${section}-${toKebabCase(name)}`;
                    const fieldInfoClass = getFieldInfoClass(elem, type, name);
                    const isApplicable = applicabilityMap[name];
                    const collapsible = !!canApply;

                    const elemProps = {
                        id: fieldId,
                        name,
                        type,
                        step,
                        min,
                        placeholder,
                        value: fieldsState[name]?.value,
                        autoComplete: 'off',
                        onChange: handleFieldChange,
                        onBlur: trim ? handleFieldBlur : undefined,
                        disabled: isFormLocked || !isApplicable
                    };

                    let fieldElem;

                    if (elem === 'select') {
                        fieldElem = (
                            <select {...elemProps}>
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
                                {...elemProps}
                                label={checkboxLabel}
                                checked={fieldsState[name]?.value}
                                value={undefined}
                            />
                        );
                    } else {
                        fieldElem = React.createElement(elem, elemProps);
                    }

                    const formEntryElem = (
                        <div key={fieldId} className={cn('form-entry', fieldInfoClass)}>
                            <label htmlFor={fieldId} className="form-entry-label">
                                {label}
                                {tooltip && <span className="info" title={tooltip}>ⓘ</span>}
                                :
                                {optional && <small className="optional">опционально</small>}
                            </label>

                            <div className={cn('form-entry-field', fieldsState[name]?.uiStatus)}>
                                {fieldElem}

                                {fieldsState[name]?.error && (
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
