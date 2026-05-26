import { useMemo, useReducer, useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import TrackedImage from '@/components/common/TrackedImage.jsx';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import { sendOrderItemsAvailabilityRequest } from '@/api/orderRequests.js';
import {
    PRODUCT_IMAGE_PLACEHOLDER,
    NO_VALUE_LABEL,
    FIELD_UI_STATUS,
    SUCCESS_DELAY
} from '@/config/constants.js';
import { openAlertModal } from '@/services/modalAlertService.js';
import {
    extendFieldConfigs,
    createFieldConfigMap,
    createInitialFieldsState,
    fieldsStateReducer,
    getStringValue
} from '@/helpers/formHelpers.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { formatCurrency, formatProductTitle } from '@/helpers/textHelpers.js';
import { orderItemQuantityField, isObjectKey } from '@shared/commonHelpers.js';
import {
    validationRules,
    fieldErrorMessages,
    DEFAULT_FIELD_ERROR_MESSAGE
} from '@shared/fieldRules.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { JSX, ChangeEvent } from 'react';
import type {
    IFieldState,
    IProcessFormFieldsResult,
    IOrderItemsSubmitResult,
    IOrderItemsResponseResult
} from '@/types/index.js';
import type { IOrderItem, IOrderItemsUpdateBody } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TFieldConfigs = ReturnType<typeof getFieldConfigs>;
type TFieldConfig = TFieldConfigs[number];
type TFieldName = TFieldConfig['name'];

type TFieldsStateUpdates = Partial<Record<TFieldName, Partial<IFieldState>>>;

interface IOrderDetailsItemsProps {
    isEditMode: boolean;
    orderId: string;
    orderItemList: IOrderItem[];
    isItemsSubmitting: boolean;
    onItemsSubmitResult: (data: IOrderItemsSubmitResult) => void;
    itemsResponseResult: IOrderItemsResponseResult | null;
    clearItemsSubmitResult: () => void;
    clearItemsResponseResult: () => void;
}

type TOrderItemsUpdateDataBody = Omit<IOrderItemsUpdateBody, 'editReason'>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const getFieldConfigs = (
    orderItemList: IOrderItem[],
    itemsAvailabilityMap: Record<string, number> | null
) => extendFieldConfigs(orderItemList.map(item => ({
    name: orderItemQuantityField.makeName(item.productId),
    elem: 'input',
    type: 'number',
    step: 1,
    min: 0,
    max: item.quantity + (itemsAvailabilityMap?.[item.productId] ?? 0),
    defaultValue: item.quantity
}) as const));

export default function OrderDetailsItems({
    isEditMode,
    orderId,
    orderItemList,
    isItemsSubmitting,
    onItemsSubmitResult,
    itemsResponseResult,
    clearItemsSubmitResult,
    clearItemsResponseResult
}: IOrderDetailsItemsProps): JSX.Element {
    const [itemsAvailabilityMap, setItemsAvailabilityMap] = useState<
        Record<string, number> | null
    >(null);
    const [itemsAvailabilityReady, setItemsAvailabilityReady] = useState(false);
    const [itemsAvailabilityLoading, setItemsAvailabilityLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const { fieldConfigs, fieldConfigMap } = useMemo(() => {
        const configs = getFieldConfigs(orderItemList, itemsAvailabilityMap);
        const map = createFieldConfigMap<TFieldName, TFieldConfig>(configs);

        return { fieldConfigs: configs, fieldConfigMap: map };
    }, [orderItemList, itemsAvailabilityMap]);

    const [fieldsState, dispatchFieldsState] = useReducer(
        fieldsStateReducer,
        fieldConfigs,
        createInitialFieldsState<TFieldName>
    );
    const isUnmountedRef = useRef(false);
    const dispatch = useAppDispatch();

    const loadItemsAvailability = async (): Promise<void> => {
        setItemsAvailabilityLoading(true);

        const responseData = await dispatch(sendOrderItemsAvailabilityRequest(orderId));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        logRequestStatus({ context: 'ORDER: LOAD ITEMS AVAILABILITY', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            openAlertModal({
                type: 'error',
                dismissible: false,
                title: 'Не удалось загрузить данные для заказа',
                message:
                    'Ошибка при попытке получить доступное на складе количество товаров в заказе.\n' +
                    'Подробности ошибки в консоли.'
            });
        } else {
            const { orderItemsAvailabilityMap } = responseData;
            setItemsAvailabilityMap(orderItemsAvailabilityMap);
            setItemsAvailabilityReady(true);
        }

        setItemsAvailabilityLoading(false);
    };

    const handleFieldChange = (e: ChangeEvent<HTMLInputElement>): void => {
        const target = e.currentTarget;
        const { name, type, value } = target;
        if (!isObjectKey(name, fieldConfigMap)) return;
        
        const processedValue = type === 'number' && value !== '' ? Number(value) : value;

        dispatchFieldsState({
            type: 'UPDATE',
            payload: { [name]: { value: processedValue, uiStatus: '', error: '' } }
        });
    };

    const processFormFields = (): IProcessFormFieldsResult<TFieldName, TOrderItemsUpdateDataBody> => {
        const result = (Object.entries(fieldsState) as [TFieldName, IFieldState][]).reduce(
            (acc, [name, { value }]) => {
                const validation = validationRules.order.itemQuantity;
                if (!validation) {
                    console.error('Отсутствует правило валидации для поля: itemQuantity');
                    return acc;
                }

                const productId = orderItemQuantityField.parseProductId(name);
                const { min = 0, max = Infinity, defaultValue = 0 } = fieldConfigMap[name] ?? {};

                const ruleCheck = typeof value === 'number' && validation(value);
                const isValid = ruleCheck && value >= min && value <= max;

                acc.fieldsStateUpdates[name] = {
                    value,
                    uiStatus: isValid ? FIELD_UI_STATUS.VALID : FIELD_UI_STATUS.INVALID,
                    error: isValid
                        ? ''
                        : fieldErrorMessages.order.itemQuantity.quantity || DEFAULT_FIELD_ERROR_MESSAGE
                };

                if (isValid && value !== defaultValue && productId && typeof value === 'number') {
                    if (!acc.formFields.items) acc.formFields.items = [];
                    acc.formFields.items.push({ productId, quantity: value });
                    acc.changedFields.push(name);
                }
                
                if (!isValid) {
                    acc.allValid = false;
                }
        
                return acc;
            },
            {
                allValid: true,
                fieldsStateUpdates: {} as TFieldsStateUpdates,
                formFields: {} as TOrderItemsUpdateDataBody,
                changedFields: [] as TFieldName[]
            }
        );
    
        return result;
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Загрузка доступного количества товара (обновление через SSE)
    useEffect(() => {
        if (!isEditMode) return;
        if (isItemsSubmitting) return;

        setItemsAvailabilityReady(false);
    }, [orderItemList]);

    // Загрузка доступного кол-ва товаров на складе и сброс флага готовности с состоянием полей
    useEffect(() => {
        if (isEditMode) {
            if (!itemsAvailabilityLoading && !itemsAvailabilityReady) {
                loadItemsAvailability();
            }
        } else {
            setItemsAvailabilityReady(false);
            dispatchFieldsState({
                type: 'RESET',
                payload: createInitialFieldsState<TFieldName>(fieldConfigs)
            });
        }
    }, [isEditMode, itemsAvailabilityLoading, itemsAvailabilityReady]);

    // Сброс всех полей при изменении их конфигов
    useEffect(() => {
        dispatchFieldsState({
            type: 'RESET',
            payload: createInitialFieldsState<TFieldName>(fieldConfigs)
        });
    }, [fieldConfigs]);

    // Формирование и очистка данных для запроса
    useEffect(() => {
        if (!isItemsSubmitting) {
            setSubmitting(false);
            clearItemsSubmitResult();
            return;
        }

        const { allValid, fieldsStateUpdates, formFields, changedFields } = processFormFields();
        
        dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

        if (!allValid) {
            return onItemsSubmitResult({ ok: false });
        }

        setSubmitting(true);
        onItemsSubmitResult({ ok: true, items: formFields.items, changedFields });
    }, [isItemsSubmitting]);

    // Обработка и очистка результата запроса
    useEffect(() => {
        if (!itemsResponseResult) return;

        const { shouldRefreshItemsAvailability, fieldErrors, changedFields } = itemsResponseResult;

        if (shouldRefreshItemsAvailability) {
            clearItemsResponseResult();
            loadItemsAvailability(); // Для обновления максимального количества товаров
            return;
        }

        // Обработка полей с ошибками
        const fieldsStateUpdates: TFieldsStateUpdates = {};

        if (fieldErrors) {
            Object.entries(fieldErrors).forEach(([name, error]) => {
                if (!isObjectKey(name, fieldConfigMap)) return;
                fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.INVALID, error };
            });
            dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

            clearItemsResponseResult();
            return;
        }
        
        // Обработка изменённых полей
        if (changedFields) {
            changedFields.forEach(name => {
                if (!isObjectKey(name, fieldConfigMap)) return;
                fieldsStateUpdates[name] = { uiStatus: FIELD_UI_STATUS.CHANGED };
            });
            dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

            setTimeout(() => {
                if (isUnmountedRef.current) return;
                
                changedFields.forEach(name => {
                    if (!isObjectKey(name, fieldConfigMap)) return;
                    fieldsStateUpdates[name] = { uiStatus: '' };
                });
                dispatchFieldsState({ type: 'UPDATE', payload: fieldsStateUpdates });

                clearItemsResponseResult();
                loadItemsAvailability(); // Для обновления максимального количества товаров
            }, SUCCESS_DELAY);
        }
    }, [itemsResponseResult]);

    return (
        <div role="table" className={cn(
            'entity-table',
            'order-details-items-table',
            { 'edit-mode': isEditMode }
        )}>
            <div role="rowgroup" className="table-header">
                <div role="row">
                    <div role="columnheader" className="row-cell thumb">Фото</div>
                    <div role="columnheader" className="row-cell sku">Артикул</div>
                    <div role="columnheader" className="row-cell title">Наименование</div>
                    <div role="columnheader" className="row-cell price">Цена</div>
                    <div role="columnheader" className="row-cell discount">Скидка</div>
                    <div role="columnheader" className="row-cell quantity">Количество</div>
                    <div role="columnheader" className="row-cell total-price">Сумма</div>
                </div>
            </div>

            <div role="rowgroup" className="table-body">
                {orderItemList.map(({
                    productId,
                    image,
                    sku,
                    name,
                    brand,
                    quantity,
                    unit,
                    appliedDiscount,
                    appliedDiscountSource,
                    originalUnitPrice,
                    finalUnitPrice,
                    totalPrice: finalTotalPrice
                }) => {
                    const title = formatProductTitle(name, brand);

                    const thumbImageSrc = image ?? PRODUCT_IMAGE_PLACEHOLDER;
                    const thumbImageAlt = image ? title : '';

                    const formattedOriginalPrice = originalUnitPrice !== undefined
                        ? formatCurrency(originalUnitPrice)
                        : NO_VALUE_LABEL;
                    const formattedOriginalTotalPrice = originalUnitPrice !== undefined
                        ? formatCurrency(originalUnitPrice * quantity)
                        : NO_VALUE_LABEL;
                    const formattedFinalPrice = formatCurrency(finalUnitPrice);
                    const formattedFinalTotalPrice = formatCurrency(finalTotalPrice);

                    const hasDiscount = appliedDiscount > 0;

                    const discountSource = appliedDiscountSource
                        ? ({
                            customer: 'клиентская скидка',
                            product: 'скидка на товар',
                            none: ''
                        })[appliedDiscountSource]
                        : NO_VALUE_LABEL;

                    const fieldName = orderItemQuantityField.makeName(productId);
                    const fieldConfig = fieldConfigMap[fieldName];
                    if (!fieldConfig) return null;

                    return (
                        <div key={productId} data-id={productId} className="table-row">
                            <div role="row" className="table-row-main">
                                <div role="cell" className="row-cell thumb">
                                    <div className="cell-label">Фото:</div>
                                    <div className="cell-content">
                                        <div className="product-thumb">
                                            <TrackedImage
                                                className="product-thumb-img"
                                                src={thumbImageSrc}
                                                alt={thumbImageAlt}
                                            />
                                        </div>
                                    </div>
                                </div>
                                <div role="cell" className="row-cell sku">
                                    <div className="cell-label">Артикул:</div>
                                    <div className="cell-content">{sku ?? NO_VALUE_LABEL}</div>
                                </div>
                                <div role="cell" className="row-cell title">
                                    <div className="cell-label">Наименование:</div>
                                    <div className="cell-content">{title}</div>
                                </div>
                                <div role="cell" className="row-cell price">
                                    <div className="cell-label">Цена:</div>
                                    <div className="cell-content">
                                        {hasDiscount ? (
                                            <>
                                                <p>
                                                    <span className="meta-label">Без скидки: </span>
                                                    {formattedOriginalPrice} руб.
                                                </p>
                                                <p>
                                                    <span className="meta-label">Со скидкой: </span>
                                                    {formattedFinalPrice} руб.
                                                </p>
                                            </>
                                        ) : (
                                            `${formattedFinalPrice} руб.`
                                        )}
                                    </div>
                                </div>
                                <div role="cell" className="row-cell discount">
                                    <div className="cell-label">Скидка:</div>
                                    <div className="cell-content">
                                        {appliedDiscount}%
                                        {hasDiscount && (
                                            <span className="meta-label"> ({discountSource})</span>
                                        )}
                                    </div>
                                </div>
                                <div role="cell" className="row-cell quantity">
                                    <div className="cell-label">Количество:</div>
                                    <div className="cell-content">
                                            {isEditMode ? (
                                                <div className={cn(
                                                    'form-field',
                                                    fieldsState[fieldName]?.uiStatus
                                                )}>
                                                    <input
                                                        name={fieldName}
                                                        type={fieldConfig.type}
                                                        step={fieldConfig.step}
                                                        min={fieldConfig.min}
                                                        max={fieldConfig.max}
                                                        value={getStringValue(
                                                            fieldsState[fieldName]?.value
                                                        )}
                                                        onChange={handleFieldChange}
                                                        disabled={
                                                            !itemsAvailabilityReady ||
                                                            itemsAvailabilityLoading ||
                                                            submitting
                                                        }
                                                    />
                                                    {' '}
                                                    {unit}
                                                    
                                                    {fieldsState[fieldName]?.error && (
                                                        <p className="invalid-message">
                                                            *{fieldsState[fieldName].error}
                                                        </p>
                                                    )}
                                                </div>
                                            ) : (
                                                `${quantity} ${unit}`
                                            )}
                                    </div>
                                </div>
                                <div role="cell" className="row-cell total-price">
                                    <div className="cell-label">Сумма:</div>
                                    <div className="cell-content">
                                        {hasDiscount ? (
                                            <>
                                                <p>
                                                    <span className="meta-label">Без скидки: </span>
                                                    {formattedOriginalTotalPrice} руб.
                                                </p>
                                                <p>
                                                    <span className="meta-label">Со скидкой: </span>
                                                    {formattedFinalTotalPrice} руб.
                                                </p>
                                            </>
                                        ) : (
                                            `${formattedFinalTotalPrice} руб.`
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
