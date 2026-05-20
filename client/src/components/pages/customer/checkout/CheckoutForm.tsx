import { useReducer, useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import cn from 'classnames';
import Collapsible from '@/components/common/Collapsible.jsx';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';
import FormFooter from '@/components/common/FormFooter.jsx';
import BlockableLink from '@/components/common/BlockableLink.jsx';
import TrackedImage from '@/components/common/TrackedImage.jsx';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import { sendOrderDraftUpdateRequest, sendOrderDraftConfirmRequest } from '@/api/checkoutRequests.js';
import { routeConfig } from '@/config/appRouting.js';
import {
    COLLAPSIBLE_ANIMATION_DURATION,
    FORM_STATUS,
    NO_VALUE_LABEL,
    PRODUCT_IMAGE_PLACEHOLDER,
    FIELD_UI_STATUS,
    FIELD_SAVE_STATUS,
    SUCCESS_DELAY
} from '@/config/constants.js';
import { clearLockedRoute } from '@/redux/slices/uiSlice.js';
import { setCart } from '@/redux/slices/cartSlice.js';
import { applyCartState, refreshCartTotals } from '@/services/cartService.js';
import { formatCheckoutAdjustmentLogs } from '@/services/checkoutService.js';
import { openAlertModal } from '@/services/modalAlertService.js';
import {
    extractCollapsibleFormGroupNames,
    extractFieldConfigs,
    extendFormGroupConfigs,
    castFormGroupFields,
    extractFieldConfigNamesByKey,
    createFieldConfigMap,
    createInitialFieldsState,
    fieldsStateReducer,
    getStringValue,
    getBoolValue
} from '@/helpers/formHelpers.js';
import {
    formatProductTitle,
    formatCurrency,
    toKebabCase,
    pluralize,
    getFieldInfoClass
} from '@/helpers/textHelpers.js';
import generateSlug from '@/helpers/generateSlug.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import { isObjectKey, isSetMember } from '@shared/commonHelpers.js';
import {
    validationRules,
    fieldErrorMessages,
    DEFAULT_FIELD_ERROR_MESSAGE
} from '@shared/fieldRules.js';
import {
    PRODUCT_UNITS,
    DELIVERY_METHOD,
    DELIVERY_METHOD_OPTIONS,
    PAYMENT_METHOD_OPTIONS,
    MIN_ORDER_AMOUNT
} from '@shared/constants.js';
import type {
    JSX,
    Dispatch,
    SetStateAction,
    ChangeEvent,
    FocusEvent,
    SubmitEvent,
    InputHTMLAttributes,
    TextareaHTMLAttributes,
    SelectHTMLAttributes
} from 'react';
import type {
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
    IOrderDraftUpdateBody,
    IOrderDraftConfirmBody,
    IOrderDraft,
    IProduct
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TFieldConfigs = typeof fieldConfigs;
type TFieldConfig = TFieldConfigs[number];
type TFieldName = Extract<TFieldConfig['name'], TEntityField<'checkout'>>;

type TFieldsStateUpdates = Partial<Record<TFieldName, Partial<IFieldState>>>;

type TOrderDraftCommonBodyKeys = keyof (IOrderDraftUpdateBody & IOrderDraftConfirmBody);

type TApiFormFields = {
    [K in TOrderDraftCommonBodyKeys]: TFieldApiValue;
};

type TCollapsibleFormGroupName = typeof collapsibleFormGroupNames[number];

interface ICheckoutFormProps {
    orderId: string;
    orderDraft: IOrderDraft | null;
    setOrderDraft: Dispatch<SetStateAction<IOrderDraft | null>>;
    submitStates: TSubmitStates;
    lockedStatuses: Set<TFormStatus>;
    submitStatus: TFormStatus;
    setSubmitStatus: Dispatch<SetStateAction<TFormStatus>>;
    reloadOrderDraft: () => void;
    topStickyOffset: number;
    registrationEmail: string;
    cartPath: string;
    productMap: Record<string, IProduct>
}

interface IUpdatedField {
    name: TFieldName;
    value: TFieldStateValue;
}

type TOrderItemsProps = Pick<ICheckoutFormProps, 'productMap'> & {
    orderItemList: IOrderDraft['items'] | null;
    toggleFormGroupExpansion: (groupName: TCollapsibleFormGroupName) => void;
}

interface IFormGroupControlsProps {
    formGroupName: TCollapsibleFormGroupName;
    toggleFormGroupExpansion: (groupName: TCollapsibleFormGroupName) => void;
};

type TFormGroupEntriesProps = Partial<Pick<IFormGroupControlsProps,
    | 'formGroupName'
    | 'toggleFormGroupExpansion'
>> & {
    fieldConfigs: readonly TFieldConfig[];
    fieldsState: TFormState<TFieldName>;
    applicabilityMap: Record<TFieldName, boolean>;
    handleFieldChange: (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => void;
    handleFieldBlur: (
        e: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => void;
    isFormLocked: boolean;
    isSubmitInProgress: boolean;
    fillRegistrationEmail?: () => void;
    formGroupName?: TCollapsibleFormGroupName;
    toggleFormGroupExpansion?: (groupName: TCollapsibleFormGroupName) => void;
}

type TFormGroupSummaryProps = Pick<TFormGroupEntriesProps, 'fieldConfigs' | 'fieldsState'>;

type TFieldElemProps =
    InputHTMLAttributes<HTMLInputElement> &
    TextareaHTMLAttributes<HTMLTextAreaElement> &
    SelectHTMLAttributes<HTMLSelectElement>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const CLEAR_SAVE_STATUS_DELAY = 3000;

const isDeliveryRequired = ({ deliveryMethod }: { deliveryMethod: TDeliveryMethod }): boolean =>
    deliveryMethod && deliveryMethod !== DELIVERY_METHOD.SELF_PICKUP;

const formGroupConfigs = extendFormGroupConfigs([
    {
        name: 'orderItemsGroup',
        title: 'Товары в заказе',
        description: 'Основные данные товаров в заказе',
        collapsible: true,
        fieldConfigs: []
    },
    {
        name: 'customerGroup',
        title: 'Покупатель',
        description: 'Основные данные покупателя',
        collapsible: true,
        fieldConfigs: [
            {
                name: 'firstName',
                label: 'Имя',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите имя покупателя',
                autoComplete: 'given-name',
                trim: true
            },
            {
                name: 'lastName',
                label: 'Фамилия',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите фамилию покупателя',
                autoComplete: 'family-name',
                trim: true
            },
            {
                name: 'middleName',
                label: 'Отчество',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите отчество покупателя, если есть',
                autoComplete: 'additional-name',
                trim: true,
                optional: true
            },
            {
                name: 'email',
                label: 'Email',
                elem: 'input',
                type: 'text', // Чтобы срабатывали изменения для пробелов в начале и конце
                placeholder: 'Укажите почтовый ящик',
                autoComplete: 'email',
                trim: true
            },
            {
                name: 'phone',
                label: 'Телефон',
                elem: 'input',
                type: 'tel',
                placeholder: 'Укажите номер телефона',
                autoComplete: 'tel',
                trim: true
            }
        ]
    },
    {
        name: 'deliveryGroup',
        title: 'Доставка',
        description: 'Информация для доставки заказа',
        collapsible: true,
        fieldConfigs: [
            {
                name: 'deliveryMethod',
                label: 'Метод доставки',
                elem: 'select',
                options: [
                    { value: '', label: '--- Выбрать метод доставки ---' },
                    ...DELIVERY_METHOD_OPTIONS
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
                canApply: ({ deliveryMethod }: { deliveryMethod: TDeliveryMethod }): boolean =>
                    deliveryMethod === DELIVERY_METHOD.COURIER
            },
            {
                name: 'region',
                label: 'Область/Регион',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите полное название региона',
                autoComplete: 'address-level1',
                trim: true,
                address: true,
                optional: true,
                canApply: isDeliveryRequired
            },
            {
                name: 'district',
                label: 'Район',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите район',
                autoComplete: 'address-level2',
                trim: true,
                address: true,
                optional: true,
                canApply: isDeliveryRequired
            },
            {
                name: 'city',
                label: 'Город',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите город',
                autoComplete: 'address-level2',
                trim: true,
                address: true,
                canApply: isDeliveryRequired
            },
            {
                name: 'street',
                label: 'Улица',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите улицу',
                autoComplete: 'street-address',
                trim: true,
                address: true,
                canApply: isDeliveryRequired
            },
            {
                name: 'house',
                label: 'Дом',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите номер дома',
                autoComplete: 'address-line1',
                trim: true,
                address: true,
                canApply: isDeliveryRequired
            },
            {
                name: 'apartment',
                label: 'Квартира',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите номер квартиры',
                autoComplete: 'address-line2',
                trim: true,
                address: true,
                optional: true,
                canApply: isDeliveryRequired
            },
            {
                name: 'postalCode',
                label: 'Почтовый индекс',
                elem: 'input',
                type: 'text',
                placeholder: 'Укажите почтовый индекс',
                autoComplete: 'postal-code',
                trim: true,
                address: true,
                optional: true,
                canApply: isDeliveryRequired
            }
        ]
    },
    {
        name: 'paymentGroup',
        title: 'Оплата',
        description: 'Выбор способа оплаты',
        collapsible: true,
        fieldConfigs: [
            {
                name: 'defaultPaymentMethod',
                label: 'Способ оплаты',
                elem: 'select',
                options: [
                    { value: '', label: '--- Выбрать способ оплаты ---' },
                    ...PAYMENT_METHOD_OPTIONS
                ]
            }
        ]
    },
    {
        name: 'customerCommentGroup',
        collapsible: false,
        fieldConfigs: [
            {
                name: 'customerComment',
                label: 'Комментарий',
                elem: 'textarea',
                placeholder: 'Напишите комментарий к заказу',
                trim: true,
                optional: true
            }
        ]
    }
] as const satisfies readonly IFormGroupConfig[]);

const collapsibleFormGroupNames = extractCollapsibleFormGroupNames(formGroupConfigs);
const fieldConfigs = extractFieldConfigs(formGroupConfigs);
const fieldConfigMap = createFieldConfigMap<TFieldName, TFieldConfig>(fieldConfigs);
const initialFieldsState = createInitialFieldsState<TFieldName>(fieldConfigs, { autoSave: true });
const shippingAddressFieldNames = extractFieldConfigNamesByKey(fieldConfigs, 'address');

export default function CheckoutForm({
    orderId,
    orderDraft,
    setOrderDraft,
    submitStates,
    lockedStatuses,
    submitStatus,
    setSubmitStatus,
    reloadOrderDraft,
    topStickyOffset,
    registrationEmail,
    cartPath,
    productMap
}: ICheckoutFormProps): JSX.Element {
    const [fieldsState, dispatchFieldsState] = useReducer(fieldsStateReducer, initialFieldsState);
    
    const [initializedValues, setInitializedValues] = useState(false);
    const [expandedFormGroup, setExpandedFormGroup] = useState<TCollapsibleFormGroupName | ''>('');
    const [visitedFormGroups, setVisitedFormGroups] = useState<
        Set<TCollapsibleFormGroupName>
    >(new Set());
    const [isAllGroupsVisited, setIsAllGroupsVisited] = useState(false);
    const [isOrderItemsValid, setIsOrderItemsValid] = useState(false);
    
    const formGroupRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const updateDebounceTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const fieldsStateRef = useRef(fieldsState);
    const saveStatusTimersRef = useRef<
        Partial<Record<TFieldName, ReturnType<typeof setTimeout>>>
    >({});
    const submitInProgressRef = useRef(false);
    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();
    const navigate = useNavigate();

    fieldsStateRef.current = fieldsState; // Обновление рефа состояния при каждом рендере

    const applicabilityMap = useMemo(
        () => Object.fromEntries(
            fieldConfigs.map(cfg => [
                cfg.name,
                typeof cfg.canApply === 'function'
                    ? cfg.canApply({ deliveryMethod: fieldsState.deliveryMethod.value })
                    : true
            ])
        ) as Record<TFieldName, boolean>,
        [fieldsState.deliveryMethod.value]
    );

    const isFormLocked = lockedStatuses.has(submitStatus);
    const orderItemList = orderDraft?.items ?? null;

    const scrollToFormGroup = (groupName: TCollapsibleFormGroupName): void => {
        const groupTop = formGroupRefs.current[groupName]?.getBoundingClientRect().top ?? 0;
        const scrollY = window.scrollY + groupTop - topStickyOffset;
        window.scrollTo({ top: scrollY, behavior: 'smooth' });
    };

    const toggleFormGroupExpansion = (groupName: TCollapsibleFormGroupName): void => {
        setVisitedFormGroups(prev => new Set(prev).add(groupName));
        setExpandedFormGroup(prev => (prev === groupName ? '' : groupName));

        // Клик на title группы => скроллинг страницы только при раскрытии группы
        const willExpandFormGroup = groupName !== expandedFormGroup;

        if (willExpandFormGroup) {
            setTimeout(() => {
                if (isUnmountedRef.current) return;
                scrollToFormGroup(groupName);
            }, COLLAPSIBLE_ANIMATION_DURATION);
        }
    };

    const updateOrderDraft = async (
        updatedField?: IUpdatedField,
        { isReplay = false }: { isReplay?: boolean } = {}
    ): Promise<void> => {
        const updateFieldMap = (Object.entries(fieldsStateRef.current) as [TFieldName, IFieldState][])
            .reduce((acc, [name, state]) => {
                const isReplayField = updatedField?.name === name && isReplay;
                if (state.saveStatus === FIELD_SAVE_STATUS.SAVING && !isReplayField) return acc;

                const value = name === updatedField?.name ? updatedField.value : state.value;
                const { trim } = fieldConfigMap[name] ?? {};
                const normalizedValue = typeof value === 'string' && trim ? value.trim() : value;

                if (normalizedValue === state.savedValue && !isReplayField) return acc;

                // Сброс таймеров очистки статуса для отправляемых полей
                if (saveStatusTimersRef.current[name]) {
                    clearTimeout(saveStatusTimersRef.current[name]);
                    delete saveStatusTimersRef.current[name];
                }

                // Сбор полей
                acc.set(name, normalizedValue);
                
                if (name === 'deliveryMethod') {
                    const { COURIER, TRANSPORT_COMPANY } = DELIVERY_METHOD;
                    
                    if (normalizedValue === COURIER) {
                        acc.set('allowCourierExtra', fieldsStateRef.current.allowCourierExtra.value);
                    }
                    if (normalizedValue === TRANSPORT_COMPANY || normalizedValue === COURIER) {
                        shippingAddressFieldNames.forEach(name => {
                            acc.set(name, fieldsStateRef.current[name].value);
                        });
                    }
                }

                return acc;
            }, new Map() as Map<TFieldName, TFieldStateValue>);

        if (!updateFieldMap.size) return;

        const updateFields: IOrderDraftUpdateBody = Object.fromEntries(updateFieldMap);

        // Изменение статуса состояния на saving
        dispatchFieldsState({
            type: 'SAVE',
            payload: { fields: updateFields, status: FIELD_SAVE_STATUS.SAVING }
        });

        // Отправка запроса апдейта полей на сервер
        const responseData = await dispatch(sendOrderDraftUpdateRequest(orderId, updateFields));
        if (isUnmountedRef.current) return;

        // Сбор завершённых полей и новый апдейт тех, чьё значение изменилось за время запроса
        const processedUpdateFields: Partial<Record<TFieldName, TFieldStateValue>> = {};

        updateFieldMap.forEach((requestedValue, name) => {
            const currentValue = fieldsStateRef.current[name].value;
            const normalizedCurrentValue =
                typeof currentValue === 'string' && fieldConfigMap[name]?.trim
                    ? currentValue.trim()
                    : currentValue;

            if (normalizedCurrentValue === requestedValue) {
                processedUpdateFields[name] = requestedValue;
            } else {
                updateOrderDraft({ name, value: currentValue }, { isReplay: true });
            }
        });

        const processedUpdateFieldKeys = Object.keys(processedUpdateFields) as TFieldName[];
        if (!processedUpdateFieldKeys.length) return;

        // Логирование ответа сервера, обновление статуса и сохранение состояния
        const { status, message } = responseData;
        logRequestStatus({ context: 'CHECKOUT: UPDATE', status, message });

        if (status !== FORM_STATUS.SUCCESS && lockedStatuses.has(status)) {
            dispatch(clearLockedRoute());
            setSubmitStatus(status);
        }
        
        const saveStatus = status === FORM_STATUS.SUCCESS
            ? FIELD_SAVE_STATUS.SUCCESS
            : FIELD_SAVE_STATUS.ERROR;
        dispatchFieldsState({
            type: 'SAVE',
            payload: { fields: processedUpdateFields, status: saveStatus }
        });

        // Взвод таймеров для очистки статуса сохранения
        processedUpdateFieldKeys.forEach((name) => {
            if (saveStatusTimersRef.current[name]) {
                clearTimeout(saveStatusTimersRef.current[name]);
            }
            scheduleClearSaveStatus(name);
        });
    };

    const scheduleClearSaveStatus = (fieldName: TFieldName): void => {
        saveStatusTimersRef.current[fieldName] = setTimeout(() => {
            if (isUnmountedRef.current) return;

            delete saveStatusTimersRef.current[fieldName];
            dispatchFieldsState({
                type: 'CLEAR_SAVE_STATUS',
                payload: { name: fieldName }
            });
        }, CLEAR_SAVE_STATUS_DELAY);
    };
    
    const clearUpdateDebounceTimer = (): void => {
        clearTimeout(updateDebounceTimerRef.current);
        updateDebounceTimerRef.current = undefined;
    };

    const handleFieldChange = (
        e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ): void => {
        const target = e.currentTarget;
        const { name, type, value } = target;
        if (!isObjectKey(name, fieldConfigMap)) return;

        clearUpdateDebounceTimer();

        const checked = 'checked' in target ? target.checked : false;
        const processedValue = type === 'checkbox' ? checked : value;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: processedValue, uiStatus: '', error: '' } }
        });
    
        updateDebounceTimerRef.current = setTimeout(() => {
            if (isUnmountedRef.current) return;

            clearUpdateDebounceTimer();
            updateOrderDraft({ name, value: processedValue });
        }, 1250);
    };

    const handleFieldBlur = (
        e: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ): void => {
        const target = e.currentTarget;
        const { name, type, value } = target;
        if (!isObjectKey(name, fieldConfigMap)) return;

        clearUpdateDebounceTimer();

        const normalizedValue = fieldConfigMap[name]?.trim ? value.trim() : value;

        if (normalizedValue !== value) {
            dispatchFieldsState({
                type: 'UPDATE',
                payload: { [name]: { value: normalizedValue } }
            });
        }

        const checked = 'checked' in target ? target.checked : false;
        const fieldValue = type === 'checkbox' ? checked : value;

        updateOrderDraft({ name, value: fieldValue });
    };
    
    const fillRegistrationEmail = (): void => {
        clearUpdateDebounceTimer();

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { email: { value: registrationEmail, uiStatus: '', error: '' } }
        });
        
        updateOrderDraft({ name: 'email', value: registrationEmail });
    };

    const processFormFields = (): IProcessFormFieldsResult<
        TFieldName,
        IOrderDraftConfirmBody
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

                const isValid = optional ? (!normalizedValue || ruleCheck) : ruleCheck;

                acc.fieldsStateUpdates[name] = {
                    value: normalizedValue,
                    uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
                    error: isValid
                        ? ''
                        : fieldErrorMessages.checkout[name].default || DEFAULT_FIELD_ERROR_MESSAGE
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
                formFields: {} as IOrderDraftConfirmBody,
                changedFields: [] as TFieldName[]
            }
        );
    
        return result;
    };
    
    const handleFormSubmit = async (e: SubmitEvent<HTMLFormElement>): Promise<void> => {
        e.preventDefault();

        clearUpdateDebounceTimer();
        const { allValid, fieldsStateUpdates, formFields, changedFields = [] } = processFormFields();
        
        dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });
        setIsOrderItemsValid(true);

        if (!allValid) {
            setSubmitStatus(FORM_STATUS.INVALID);
            updateOrderDraft(); // Синхронизация сохранённых значений полей с текущими
            return;
        }

        submitInProgressRef.current = true;
        setSubmitStatus(FORM_STATUS.SENDING);

        const responseData = await dispatch(sendOrderDraftConfirmRequest(orderId, formFields));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        const LOG_CTX = 'CHECKOUT: CONFIRM';

        switch (status) {
            case FORM_STATUS.UNAUTH:
            case FORM_STATUS.USER_GONE:
            case FORM_STATUS.DENIED:
            case FORM_STATUS.FORBIDDEN:
            case FORM_STATUS.NOT_FOUND:
                logRequestStatus({ context: LOG_CTX, status, message });
                dispatch(clearLockedRoute());
                setSubmitStatus(status);
                break;

            case FORM_STATUS.BAD_REQUEST:
            case FORM_STATUS.ERROR:
            case FORM_STATUS.TIMEOUT:
                submitInProgressRef.current = false;
                logRequestStatus({ context: LOG_CTX, status, message });
                setSubmitStatus(status);
                updateOrderDraft(); // Синхронизация сохранённых значений полей с текущими
                break;

            // Товары в корзине и заказе не совпадают
            case FORM_STATUS.CONFLICT:
                logRequestStatus({ context: LOG_CTX, status, message });
                setIsOrderItemsValid(false);
                setSubmitStatus(status);

                const conflictMsg =
                    'Товары в корзине и черновике заказа не совпадают.\n' +
                    '<span className="color-red">Заказ отменён!</span> ' +
                    'Вы будете перенаправлены на страницу корзины.';

                openAlertModal({
                    openDelay: 1000,
                    type: 'error',
                    dismissible: false,
                    title: 'Произошла рассинхронизация',
                    message: conflictMsg,
                    dismissBtnLabel: 'Перейти в корзину',
                    onClose: () => {
                        dispatch(clearLockedRoute());
                        navigate(cartPath);
                    }
                });
                break;

            // Сумма заказа меньше минимальной
            case FORM_STATUS.LIMITATION: {
                const { 
                    tradeProductList, cartItemList, customerDiscount,
                    currentTotal, orderItemAdjustments
                } = responseData;

                logRequestStatus({ context: LOG_CTX, status, message });
                dispatch(applyCartState(tradeProductList, cartItemList, customerDiscount));
                setIsOrderItemsValid(false);
                setSubmitStatus(status);

                const amountToAdd = Math.max(0, MIN_ORDER_AMOUNT - currentTotal);
                const minOrderAmountMsg =
                    'Сумма заказа после синхронизации с текущими данными каталога ' +
                    'стала меньше минимальной.\n' +
                    '<span className="color-red">Заказ отменён!</span> ' +
                    'Вы будете перенаправлены на страницу корзины.\n\n' +
                    'Минимальная сумма заказа — ' +
                    `<span className="color-blue">${formatCurrency(MIN_ORDER_AMOUNT)}</span> ₽. ` +
                    'Добавьте товаров ещё на ' +
                    `<span className="color-green">${formatCurrency(amountToAdd)}</span> ₽.`;

                const hasAdjustments = orderItemAdjustments?.length > 0;
                const adjustmentsMsg = hasAdjustments
                    ? '\n\n\n<span className="bold underline">Изменения товаров в заказе:</span>' +
                        `\n\n${formatCheckoutAdjustmentLogs(orderItemAdjustments)}`
                    : '';

                openAlertModal({
                    openDelay: 1000,
                    type: 'error',
                    dismissible: false,
                    title: 'Сумма заказа меньше минимальной',
                    message: minOrderAmountMsg + adjustmentsMsg,
                    dismissBtnLabel: 'Перейти в корзину',
                    onClose: () => {
                        dispatch(clearLockedRoute());
                        navigate(cartPath);
                    }
                });
                
                break;
            }

            // Изменения в результате синхронизации черновика заказа
            case FORM_STATUS.MODIFIED: {
                const {
                    tradeProductList, cartItemList, customerDiscount,
                    orderDraft, orderItemAdjustments
                } = responseData;

                submitInProgressRef.current = false;
                logRequestStatus({ context: LOG_CTX, status, message });
                dispatch(applyCartState(tradeProductList, cartItemList, customerDiscount));
                setOrderDraft(prev => ({ ...(prev ?? {}), ...orderDraft }));
                setIsOrderItemsValid(false);
                setSubmitStatus(status);
                updateOrderDraft(); // Синхронизация сохранённых значений полей с текущими

                const adjustmentsMsg =
                    '<span className="bold underline">Изменения товаров в заказе:</span>' +
                    `\n\n${formatCheckoutAdjustmentLogs(orderItemAdjustments)}` +
                    '\n\n\nПожалуйста, подтвердите заказ ещё раз.';

                openAlertModal({
                    openDelay: 1000,
                    type: 'warn',
                    dismissible: false,
                    title: 'Заказ был синхронизирован с текущими данными каталога',
                    message: adjustmentsMsg,
                    onClose: () => {
                        if (expandedFormGroup === 'orderItemsGroup') {
                            scrollToFormGroup('orderItemsGroup');
                        } else {
                            setExpandedFormGroup('orderItemsGroup');
                            setTimeout(() => {
                                if (isUnmountedRef.current) return;
                                scrollToFormGroup('orderItemsGroup');
                            }, COLLAPSIBLE_ANIMATION_DURATION);
                        }
                    }
                });

                break;
            }

            // Ошибки валидации полей
            case FORM_STATUS.INVALID: {
                const { fieldErrors } = responseData;

                submitInProgressRef.current = false;
                logRequestStatus({
                    context: LOG_CTX,
                    status,
                    message,
                    details: fieldErrors
                });

                const fieldsStateUpdates: TFieldsStateUpdates = {};
                Object.entries(fieldErrors).forEach(([name, error]) => {
                    if (!isObjectKey(name, fieldConfigMap)) return;
                    fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.INVALID, error };
                });
                dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

                setSubmitStatus(status);
                updateOrderDraft(); // Синхронизация сохранённых значений полей с текущими
                break;
            }
        
            case FORM_STATUS.SUCCESS: {
                logRequestStatus({ context: LOG_CTX, status, message });

                const fieldsStateUpdates: TFieldsStateUpdates = {};
                changedFields.forEach(name => {
                    fieldsStateUpdates[name] = {
                        uiStatus: FIELD_UI_STATUS.CHANGED,
                        savedValue: fieldsState[name].value
                    };
                });
                dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

                setSubmitStatus(status);

                setTimeout(() => {
                    if (isUnmountedRef.current) return;
                    
                    dispatch(setCart([])); // До обновления сумм!
                    dispatch(refreshCartTotals());
                    dispatch(clearLockedRoute());
                    navigate(routeConfig.customerOrders.paths[0]);
                }, SUCCESS_DELAY);
                break;
            }
        
            default:
                submitInProgressRef.current = false;
                logRequestStatus({ context: LOG_CTX, status, message, unhandled: true });
                setSubmitStatus(FORM_STATUS.UNKNOWN);
                updateOrderDraft(); // Синхронизация сохранённых значений полей с текущими
                break;
        }
    };
    
    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Установка начальных значений полей заказа после первой загрузки данных
    useEffect(() => {
        if (initializedValues) return;
        if (!orderDraft) return;

        // Выпрямление начальных значений полей и установка их в состояние редьюсера
        const { customerInfo, delivery, financials, customerComment } = orderDraft ?? {};
        const { firstName, lastName, middleName, email, phone } = customerInfo ?? {};
        const { deliveryMethod, allowCourierExtra, shippingAddress } = delivery ?? {};
        const { region, district, city, street, house, apartment, postalCode } = shippingAddress ?? {};
        const { defaultPaymentMethod } = financials ?? {};

        const flatInitValues: Record<TFieldName, TFieldStateValue> = {
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
            customerComment: customerComment ?? ''
        };
        
        dispatchFieldsState({
            type: 'UPDATE',
            payload: Object.fromEntries(
                Object.entries(flatInitValues)
                    .map(([name, value]) => ([name, { value, savedValue: value }]))
            )
        });

        // Раскрытие первой группы формы с товарами в заказе
        setExpandedFormGroup('orderItemsGroup');
        setVisitedFormGroups(prev => new Set(prev).add('orderItemsGroup'));

        setInitializedValues(true);
    }, [initializedValues, orderDraft]);

    // Отслеживание посещения всех свёрнутых групп формы
    useEffect(() => {
        const allVisited = collapsibleFormGroupNames.every(name => visitedFormGroups.has(name));
        if (allVisited) setIsAllGroupsVisited(true);
    }, [visitedFormGroups.size]);

    // Сброс статуса формы при отсутствии ошибок полей
    useEffect(() => {
        if (submitStatus !== FORM_STATUS.INVALID) return;

        const isErrorField = Object.values(fieldsState).some(state => Boolean(state.error));
        if (!isErrorField) setSubmitStatus(FORM_STATUS.DEFAULT);
    }, [submitStatus, fieldsState]);

    return (
        <form className="checkout-form" onSubmit={handleFormSubmit} noValidate>
            <div className="form-body">
                {formGroupConfigs.map(({ name, title, description, fieldConfigs }, idx) => {
                    const extendedFieldConfigs = castFormGroupFields(fieldConfigs);

                    const isVisited = isSetMember(name, visitedFormGroups);

                    const isValid = extendedFieldConfigs.filter(cfg => applicabilityMap[cfg.name])
                        .every(cfg =>
                            fieldsState[cfg.name]?.uiStatus === FIELD_UI_STATUS.VALID ||
                            fieldsState[cfg.name]?.uiStatus === FIELD_UI_STATUS.CHANGED
                        ) ?? false;

                    const isInvalid = !isValid && (extendedFieldConfigs.some(cfg =>
                        fieldsState[cfg.name]?.uiStatus === FIELD_UI_STATUS.INVALID
                    ) ?? false);

                    return (
                        <div
                            key={name}
                            ref={(elem) => { formGroupRefs.current[name] = elem; }}
                            className={cn('form-group', toKebabCase(name))}
                        >
                            {name === 'orderItemsGroup' ? (
                                <>
                                    <div
                                        className={cn(
                                            'form-group-title',
                                            { 'visited': isVisited },
                                            { 'valid': isOrderItemsValid }
                                        )}
                                        title={description}
                                        onClick={() => isVisited && toggleFormGroupExpansion(name)}
                                    >
                                        <h4>
                                            <span className="form-group-number">{idx + 1}</span>
                                            {title}
                                            {orderItemList && (
                                                ` (${orderItemList.length} ${pluralize(
                                                    orderItemList.length,
                                                    ['позиция', 'позиции', 'позиций']
                                                )})`
                                            )}
                                        </h4>
                                        {isVisited && (
                                            <p className="form-group-action">Просмотр</p>
                                        )}
                                    </div>

                                    <Collapsible
                                        isExpanded={expandedFormGroup === name}
                                        className="order-items-collapsible"
                                    >
                                        <OrderItems
                                            orderItemList={orderItemList}
                                            productMap={productMap}
                                            toggleFormGroupExpansion={toggleFormGroupExpansion}
                                        />
                                    </Collapsible>
                                </>
                            ) : name === 'customerCommentGroup' ? (
                                <FormGroupEntries
                                    fieldConfigs={extendedFieldConfigs}
                                    fieldsState={fieldsState}
                                    applicabilityMap={applicabilityMap}
                                    handleFieldChange={handleFieldChange}
                                    handleFieldBlur={handleFieldBlur}
                                    isFormLocked={isFormLocked}
                                    isSubmitInProgress={submitInProgressRef.current}
                                />
                            ) : (
                                <>
                                    <div
                                        className={cn(
                                            'form-group-title',
                                            { 'visited': isVisited },
                                            { 'valid': isValid },
                                            { 'invalid': isInvalid }
                                        )}
                                        title={description}
                                        onClick={() => isVisited && toggleFormGroupExpansion(name)}
                                    >
                                        <h4>
                                            <span className="form-group-number">{idx + 1}</span>
                                            {title}
                                        </h4>
                                        {isVisited && (
                                            <p className="form-group-action">Редактирование</p>
                                        )}
                                    </div>

                                    <Collapsible
                                        isExpanded={isVisited && expandedFormGroup !== name}
                                        className="form-group-summary-collapsible"
                                        showContextIndicator={false}
                                    >
                                        <FormGroupSummary
                                            fieldConfigs={extendedFieldConfigs}
                                            fieldsState={fieldsState}
                                        />
                                    </Collapsible>

                                    <Collapsible
                                        isExpanded={expandedFormGroup === name}
                                        className="form-group-entries-collapsible"
                                    >
                                        <FormGroupEntries
                                            fieldConfigs={extendedFieldConfigs}
                                            fieldsState={fieldsState}
                                            applicabilityMap={applicabilityMap}
                                            handleFieldChange={handleFieldChange}
                                            handleFieldBlur={handleFieldBlur}
                                            isFormLocked={isFormLocked}
                                            isSubmitInProgress={submitInProgressRef.current}
                                            fillRegistrationEmail={fillRegistrationEmail}
                                            formGroupName={name}
                                            toggleFormGroupExpansion={toggleFormGroupExpansion}
                                        />
                                    </Collapsible>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>

            <FormFooter
                submitStates={submitStates}
                submitStatus={submitStatus}
                uiBlocked={isFormLocked || !isAllGroupsVisited}
                reloadData={reloadOrderDraft}
            />
        </form>
    );
}

function OrderItems({
    orderItemList,
    productMap,
    toggleFormGroupExpansion
}: TOrderItemsProps): JSX.Element | null {
    if (!orderItemList) return null;

    return (
        <div role="list" className="order-items">
            <div className="order-items-headers">
                <div className="product-thumb">Фото</div>
                <div className="product-title">Наименование</div>
                <div className="product-sku">Артикул</div>
                <div className="product-quantity">Количество</div>
                <div className="product-total-amounts">Сумма</div>
            </div>

            {orderItemList.map(orderItem => {
                const { productId, quantity, priceSnapshot, appliedDiscountSnapshot } = orderItem;

                const product = productMap[productId];
                const {
                    images = [],
                    mainImageIndex = 0,
                    sku,
                    name,
                    brand,
                    unit = PRODUCT_UNITS[0] ?? 'ед.'
                } = product ?? {};

                const title = formatProductTitle(name, brand) || `Товар (${productId})`;
                const slug = generateSlug(title);
                const productUrl = routeConfig.productDetails.generatePath({ productId, slug, sku });

                const hasImages = images.length > 0;
                const mainImage = hasImages ? images[mainImageIndex] ?? images[0] : null;
                const thumbImageSrc = mainImage?.thumbnails.small ?? PRODUCT_IMAGE_PLACEHOLDER;
                const thumbImageAlt = hasImages ? title : '';

                const hasDiscount = appliedDiscountSnapshot > 0;
                const currentPrice = hasDiscount
                    ? priceSnapshot * (1 - appliedDiscountSnapshot / 100)
                    : priceSnapshot;
                const originalTotal = priceSnapshot * quantity;
                const currentTotal = currentPrice * quantity;

                const formattedOriginalTotal = formatCurrency(originalTotal);
                const formattedCurrentTotal = formatCurrency(currentTotal)

                return (
                    <article
                        key={productId}
                        role="listitem"
                        data-id={productId}
                        className={cn('order-item', { 'has-discount': hasDiscount })}
                    >
                        <div className="product-thumb">
                            <BlockableLink to={productUrl}>
                                <TrackedImage
                                    className="product-thumb-img"
                                    src={thumbImageSrc}
                                    alt={thumbImageAlt}
                                />
                            </BlockableLink>
                        </div>

                        <div className="product-title">
                            <BlockableLink to={productUrl}>
                                {title}
                            </BlockableLink>
                        </div>

                        <div className="product-sku product-info-item">
                            {sku && (
                                <>
                                    <p className="label">Артикул<span className="colon">:</span></p>
                                    <p className="value">{sku}</p>
                                </>
                            )}
                        </div>

                        <div className="product-quantity product-info-item">
                            <p className="label">Количество<span className="colon">:</span></p>
                            <p className="value">{quantity} {unit}</p>
                        </div>

                        <div className="product-total-amounts product-info-item">
                            <p className="label">Сумма<span className="colon">:</span></p>
                            <div className="value">
                                {hasDiscount && (
                                    <p className="product-original-total">
                                        {formattedOriginalTotal} руб.
                                    </p>
                                )}
                                <p className="product-current-total">
                                    {formattedCurrentTotal} руб.
                                </p>
                            </div>
                        </div>
                    </article>
                );
            })}

            <FormGroupControls
                formGroupName="orderItemsGroup"
                toggleFormGroupExpansion={toggleFormGroupExpansion}
            />
        </div>
    );
}

function FormGroupSummary(
    { fieldConfigs, fieldsState }: TFormGroupSummaryProps
): JSX.Element {
    return (
        <div className="form-group-summary">
            {fieldConfigs.map(fieldConfig => {
                const fieldState = fieldsState[fieldConfig.name];
                const displayValue = (
                    fieldConfig.elem === 'select' && fieldState?.value
                        ? fieldConfig.options.find(opt => opt.value === fieldState.value)?.label ?? ''
                        : typeof fieldState?.value === 'string'
                            ? fieldState.value
                            : ''
                ) || NO_VALUE_LABEL;
        
                return (
                        <p
                            key={`summary-${fieldConfig.name}`}
                            className={cn('form-entry-summary', { error: fieldState?.error })}
                        >
                            <span className="form-entry-summary-label">{fieldConfig.label}:</span>
                            {' '}
                            <span className="form-entry-summary-value">{displayValue}</span>
                        </p>
                );
            })}
        </div>
    );
}

function FormGroupEntries({
    fieldConfigs,
    fieldsState,
    applicabilityMap,
    handleFieldChange,
    handleFieldBlur,
    isFormLocked,
    isSubmitInProgress,
    fillRegistrationEmail,
    formGroupName,
    toggleFormGroupExpansion
}: TFormGroupEntriesProps): JSX.Element {
    return (
        <div className="form-group-entries">
            {fieldConfigs.map(({
                name,
                label,
                elem,
                type,
                options,
                checkboxLabel,
                placeholder,
                autoComplete,
                tooltip,
                optional,
                canApply
            }) => {
                const fieldId = `checkout-${toKebabCase(name)}`;
                const fieldInfoClass = getFieldInfoClass(elem, type, name);
                const isApplicable = applicabilityMap[name];
                const collapsible = !!canApply;

                const baseElemProps: TFieldElemProps = {
                    id: fieldId,
                    name,
                    autoComplete,
                    onChange: handleFieldChange,
                    onBlur: handleFieldBlur,
                    disabled: isFormLocked || !isApplicable,
                };

                const fieldElem = (() => {
                    if (elem === 'textarea') return (
                        <textarea
                            {...baseElemProps}
                            placeholder={placeholder}
                            value={getStringValue(fieldsState[name]?.value)}
                        >
                        </textarea>
                    );

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
                        />
                    );
                })();

                const formEntryElem = (
                    <div key={fieldId} className={cn('form-entry', fieldInfoClass)}>
                        <label htmlFor={fieldId} className="form-entry-label">
                            {label}
                            {tooltip && <span className="info" title={tooltip}>ⓘ</span>}
                            :
                            {optional && <small className="optional">опционально</small>}
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

                            <span className={cn(
                                'save-status',
                                { [fieldsState[name]?.saveStatus ?? '']: !isSubmitInProgress }
                            )}>
                                {fieldsState[name]?.saveStatusMessage ?? ''}
                            </span>

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

            {formGroupName && toggleFormGroupExpansion && (
                <FormGroupControls
                    formGroupName={formGroupName}
                    toggleFormGroupExpansion={toggleFormGroupExpansion}
                />
            )}
        </div>
    );
}

function FormGroupControls({
    formGroupName,
    toggleFormGroupExpansion
}: IFormGroupControlsProps): JSX.Element | null {
    const fromGroupIdx = collapsibleFormGroupNames.indexOf(formGroupName);
    if (fromGroupIdx === -1) return null;

    const prevFormGroupName = collapsibleFormGroupNames[fromGroupIdx - 1];
    const nextFormGroupName = collapsibleFormGroupNames[fromGroupIdx + 1];

    return (
        <div className="form-group-controls">
            <div className="prev-form-group-btn-box">
                {fromGroupIdx > 0 && prevFormGroupName && (
                    <button
                        type="button"
                        className="prev-form-group-btn"
                        onClick={() => toggleFormGroupExpansion(prevFormGroupName)}
                    >
                        <span className="icon">⮜</span> Назад
                    </button>
                )}
            </div>
            
            <div className="next-form-group-btn-box">
                {fromGroupIdx < collapsibleFormGroupNames.length - 1 && nextFormGroupName && (
                    <button
                        type="button"
                        className="next-form-group-btn"
                        onClick={() => toggleFormGroupExpansion(nextFormGroupName)}
                    >
                        Вперёд <span className="icon">⮞</span>
                    </button>
                )}
            </div>
        </div>
    );
}
