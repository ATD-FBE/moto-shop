import { OrderFinal } from '@server/db/models/Order.js';
import Product from '@server/db/models/Product.js';
import { ORDER_VIEW_MATRIX } from '@server/config/viewPolicy.js';
import { checkTimeout } from '@server/middlewares/timeoutMiddleware.js';
import {
    DEFAULT_SEARCH_TYPE,
    BASE_DB_ORDER_FIELDS,
    MANAGED_DB_ORDER_FIELDS,
    ORDER_ADJUSTMENT_TYPE
} from '@server/config/constants.js';
import { storageService } from '@server/services/storage/storageService.js';
import * as sseOrderManagement from '@server/services/sse/sseOrderManagementService.js';
import {
    calculateOrderTotals,
    calculateOrderFinancials,
    orderDotNotationMap,
    prepareOrder,
    getLastActiveOrderStatus,
    prepareOrderStatusEntry,
    prepareShippingCost,
    prepareAuditLogEntry,
    getFinancialsState,
    getOrderStatusTransitionData,
    returnProductsToStore,
    getFieldErrors,
    updateCustomerTotalSpent,
    processOrderItemsUpdate
} from '@server/services/orderService.js';
import { applyProductBulkUpdate } from '@server/services/productService.js';
import {
    buildSearchMatch,
    buildFilterMatch,
    parseSortParam
} from '@server/utils/aggregationUtils.js';
import {
    normalizeInputDataToNull,
    dotNotationToObject,
    deepMergeNewNullable
} from '@server/utils/normalizeUtils.js';
import { collectDbChanges } from '@server/utils/compareUtils.js';
import { requireDbUser, requireRole } from '@server/utils/typeGuards.js';
import { runInDbTransaction } from '@server/utils/dbUtils.js';
import { createAppError } from '@server/utils/errorUtils.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import { ordersFilterOptions } from '@shared/filterOptions.js';
import { ordersSortOptions } from '@shared/sortOptions.js';
import { ordersPageLimitOptions } from '@shared/pageLimitOptions.js';
import { isEqualCurrency, isObjectKey } from '@shared/commonHelpers.js';
import {
    MIN_ORDER_AMOUNT,
    USER_ROLE,
    DELIVERY_METHOD,
    ORDER_STATUS,
    ORDER_ACTIVE_STATUSES,
    ORDER_FINAL_STATUSES,
    ORDER_ACTION,
    REQUEST_STATUS
} from '@shared/constants.js';
import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { QueryFilter } from 'mongoose';
import type {
    TDbOrderFinal,
    TDbProduct,
    TDbCartItem,
    TDbOrderAuditLogEntry,
    TDbOrderStatusHistoryEntry,
    TSelectedFields
} from '@server/types/index.js';
import type {
    TOrderListFilterParams,
    TOrderListQuery,
    TOrderListResponse,
    TOrderQuery,
    TOrderResponse,
    TOrderItemsAvailabilityResponse,
    TOrderRepeatResponse,
    IOrderInternalNoteUpdateBody,
    TOrderInternalNoteUpdateResponse,
    IOrderDetailsUpdateBody,
    TOrderDetailsUpdateResponse,
    IOrderItemsUpdateBody,
    TOrderItemsUpdateResponse,
    IOrderStatusUpdateBody,
    TOrderStatusUpdateResponse,
    IOrderDataChange,
    TEntityField
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IOrderParams extends ParamsDictionary {
    orderId: string;
}

type TOrderDotNotationMapValues = typeof orderDotNotationMap[keyof typeof orderDotNotationMap];
type TOrderDetailsUpdateBodyValues = IOrderDetailsUpdateBody[keyof IOrderDetailsUpdateBody];

type TOrderDetailsUpdateDotNotatedFields = {
    [K in TOrderDotNotationMapValues]?: TOrderDetailsUpdateBodyValues; 
};
type TOrderDetailsUpdateNormalizedFields = {
    [K in TOrderDotNotationMapValues]?: TOrderDetailsUpdateBodyValues | null; 
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

/// Загрузка списка заказов для одной страницы ///
export const handleOrderListRequest: RequestHandler<
    {},
    TOrderListResponse,
    {},
    TOrderListQuery
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;
    const dbUser = req.dbUser;
    
    // Настройка фильтра поиска
    const allowedSearchFields: (keyof TDbOrderFinal)[] = ['orderNumber'];
    const searchMatch = buildSearchMatch<TDbOrderFinal>(
        req.query.search,
        allowedSearchFields,
        DEFAULT_SEARCH_TYPE
    );
                
    // Настройка фильтра по параметрам
    const filterMatch = buildFilterMatch<
        TDbOrderFinal,
        TOrderListFilterParams
    >(req.query, ordersFilterOptions);

    // Общая фильтрация по поиску и параметрам
    const baseFilter: QueryFilter<TDbOrderFinal> = { ...searchMatch, ...filterMatch };

    // Настройка пагинации
    const page = Math.max(req.query.page ?? 1, 1);
    const limit = Math.max(req.query.limit ?? ordersPageLimitOptions[0], 1);
    const skip = (page - 1) * limit;

    try {
        let isManaged = false;
        let dbPaginatedOrderList;

        switch (dbUser.role) {
            case USER_ROLE.ADMIN: {
                isManaged = true;

                if (!baseFilter.currentStatus) {
                    const activeFilter = { ...baseFilter, currentStatus: { $in: ORDER_ACTIVE_STATUSES } };
                    const completedFilter = { ...baseFilter, currentStatus: ORDER_STATUS.COMPLETED };
                    const cancelledFilter = { ...baseFilter, currentStatus: ORDER_STATUS.CANCELLED };
    
                    const [activeCount, completedCount] = await Promise.all([
                        OrderFinal.countDocuments(activeFilter),
                        OrderFinal.countDocuments(completedFilter)
                        // Без cancelledCount, т.к. dbCancelledOrders ограничивается в конце общим limit
                    ]);
                    checkTimeout(req);
    
                    // Сначала активные, потом завершённые, потом отменённые
                    let dbActiveOrders: TDbOrderFinal[] = []
                    let dbCompletedOrders: TDbOrderFinal[] = [];
                    let dbCancelledOrders: TDbOrderFinal[] = [];
    
                    if (skip < activeCount) {
                        const activeLimit = Math.min(limit, activeCount - skip);
    
                        dbActiveOrders = await OrderFinal.find(activeFilter)
                            .sort({ lastActivityAt: -1 })
                            .skip(skip)
                            .limit(activeLimit)
                            .select(MANAGED_DB_ORDER_FIELDS)
                            .lean<TDbOrderFinal[]>();
                        checkTimeout(req);
                        
                        const remaining1 = limit - dbActiveOrders.length;
    
                        if (remaining1 > 0) {
                            dbCompletedOrders = await OrderFinal.find(completedFilter)
                                .sort({ lastActivityAt: -1 })
                                .limit(remaining1)
                                .select(MANAGED_DB_ORDER_FIELDS)
                                .lean<TDbOrderFinal[]>();
                            checkTimeout(req);
                            
                            const remaining2 = remaining1 - dbCompletedOrders.length;
    
                            if (remaining2 > 0) {
                                dbCancelledOrders = await OrderFinal.find(cancelledFilter)
                                    .sort({ lastActivityAt: -1 })
                                    .limit(remaining2)
                                    .select(MANAGED_DB_ORDER_FIELDS)
                                    .lean<TDbOrderFinal[]>();
                                checkTimeout(req);
                            }
                        }
                    } else if (skip < activeCount + completedCount) {
                        const completedSkip = skip - activeCount;
                        const completedLimit = Math.min(limit, completedCount - completedSkip);
    
                        dbCompletedOrders = await OrderFinal.find(completedFilter)
                            .sort({ lastActivityAt: -1 })
                            .skip(completedSkip)
                            .limit(completedLimit)
                            .select(MANAGED_DB_ORDER_FIELDS)
                            .lean<TDbOrderFinal[]>();
                        checkTimeout(req);
                        
                        const remaining = limit - dbCompletedOrders.length;
    
                        if (remaining > 0) {
                            dbCancelledOrders = await OrderFinal.find(cancelledFilter)
                                .sort({ lastActivityAt: -1 })
                                .limit(remaining)
                                .lean<TDbOrderFinal[]>();
                            checkTimeout(req);
                        }
                    } else {
                        const cancelledSkip = skip - activeCount - completedCount;
    
                        dbCancelledOrders = await OrderFinal.find(cancelledFilter)
                            .sort({ lastActivityAt: -1 })
                            .skip(cancelledSkip)
                            .limit(limit)
                            .select(MANAGED_DB_ORDER_FIELDS)
                            .lean<TDbOrderFinal[]>();
                        checkTimeout(req);
                    }
    
                    dbPaginatedOrderList = [...dbActiveOrders, ...dbCompletedOrders, ...dbCancelledOrders];

                } else {
                    dbPaginatedOrderList = await OrderFinal.find({ ...baseFilter })
                        .sort({ lastActivityAt: -1 })
                        .skip(skip)
                        .limit(limit)
                        .select(MANAGED_DB_ORDER_FIELDS)
                        .lean<TDbOrderFinal[]>();
                    checkTimeout(req);
                }

                break;
            }

            case USER_ROLE.CUSTOMER: {
                const { sortField, sortOrder } = parseSortParam/*<TDbOrderFinal>*/(
                    req.query.sort,
                    ordersSortOptions
                );

                baseFilter.customerId = dbUser._id;

                dbPaginatedOrderList = await OrderFinal.find({ ...baseFilter })
                    .sort({ [sortField]: sortOrder })
                    .skip(skip)
                    .limit(limit)
                    .select(BASE_DB_ORDER_FIELDS)
                    .lean<TDbOrderFinal[]>();
                checkTimeout(req);

                break;
            }

            default:
                return safeSendResponse(res, 403, {
                    message: 'Запрещено: несоответствующая роль',
                    reason: REQUEST_STATUS.DENIED
                });
        }

        const dbFilteredOrders = await OrderFinal
            .find({ ...baseFilter })
            .select('_id')
            .lean<TDbOrderFinal[]>();
        checkTimeout(req);

        const filteredOrderIdList = dbFilteredOrders.map(ord => ord._id.toString());
        const paginatedOrderList = dbPaginatedOrderList.map(dbOrder => prepareOrder(dbOrder, {
            inList: true,
            managed: isManaged,
            details: true
        }));

        safeSendResponse(res, 200, {
            message: 'Заказы успешно загружены',
            filteredOrderIdList,
            paginatedOrderList
        });
    } catch (err) {
        next(err);
    }
};

/// Загрузка или обновление отдельного заказа ///
export const handleOrderRequest: RequestHandler<
    IOrderParams,
    TOrderResponse,
    {},
    TOrderQuery
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const userRole = req.dbUser.role;
    const orderId = req.params.orderId;
    const viewMode = req.query.viewMode;

    try {
        const dbOrder = await OrderFinal
            .findById(orderId)
            .populate('customerId', 'name email')
            .lean<TDbOrderFinal>();
        checkTimeout(req);

        const orderLbl = dbOrder?.orderNumber ? `№${dbOrder.orderNumber}` : `(ID: ${orderId})`;
        
        if (!dbOrder) {
            return safeSendResponse(res, 404, { message: `Заказ ${orderLbl} не найден` });
        }

        const viewConfig = ORDER_VIEW_MATRIX[userRole][viewMode];
        const order = prepareOrder(dbOrder, viewConfig);

        safeSendResponse(res, 200, { message: `Заказ ${orderLbl} успешно загружен`, order });
    } catch (err) {
        next(err);
    }
};

/// Загрузка доступного на складе количества товаров в заказе ///
export const handleOrderItemsAvailabilityRequest: RequestHandler<
    IOrderParams,
    TOrderItemsAvailabilityResponse
> = async (req, res, next) => {
    const orderId = req.params.orderId;

    try {
        const selectedOrderFields: TSelectedFields<TDbOrderFinal> = {
            orderNumber: 1,
            'items.productId': 1
        };
        const dbOrder = await OrderFinal
            .findById(orderId)
            .select(selectedOrderFields)
            .lean<TDbOrderFinal>();
        checkTimeout(req);

        const orderLbl = dbOrder?.orderNumber ? `№${dbOrder.orderNumber}` : `(ID: ${orderId})`;
        
        if (!dbOrder) {
            return safeSendResponse(res, 404, { message: `Заказ ${orderLbl} не найден` });
        }

        const productIds = dbOrder.items.map(item => item.productId);
        const selectedProductFields: TSelectedFields<TDbProduct> = {
            stock: 1,
            reserved: 1
        };
        const dbTradeProducts = await Product
            .find({ _id: { $in: productIds } })
            .select(selectedProductFields)
            .lean<TDbProduct[]>();
        checkTimeout(req);

        const dbTradeProductMap = new Map(dbTradeProducts.map(prod => [prod._id.toString(), prod]));

        const orderItemsAvailabilityMap = Object.fromEntries(
            productIds.map(productObjectId => {
                const productId = productObjectId.toString();
                const dbTradeProduct = dbTradeProductMap.get(productId);
                if (!dbTradeProduct) return [productId, 0];
                return [productId, Math.max(0, dbTradeProduct.stock - dbTradeProduct.reserved)]
            })
        );

        safeSendResponse(res, 200, {
            message: `Доступное количество на складе товаров в заказе ${orderLbl} успешно загружено`,
            orderItemsAvailabilityMap
        });
    } catch (err) {
        next(err);
    }
};

/// Повтор завершённого или отменённого заказа ///
export const handleOrderRepeatRequest: RequestHandler<
    IOrderParams,
    TOrderRepeatResponse
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const dbUser = req.dbUser;
    const orderId = req.params.orderId;

    try {
        const { orderLbl } = await runInDbTransaction(async (session) => {
            const selectedOrderFields: TSelectedFields<TDbOrderFinal> = {
                orderNumber: 1,
                customerId: 1,
                currentStatus: 1,
                items: 1
            };
            const dbOrder = await OrderFinal.findById(orderId)
                .select(selectedOrderFields)
                .lean<TDbOrderFinal>()
                .session(session);
            checkTimeout(req);

            const orderLbl = dbOrder?.orderNumber ? `№${dbOrder.orderNumber}` : `(ID: ${orderId})`;

            if (!dbOrder) {
                throw createAppError(404, `Заказ ${orderLbl} не найден`);
            }
            if (dbUser._id.toString() !== dbOrder.customerId.toString()) {
                throw createAppError(403, `Запрещено: заказ ${orderLbl} принадлежит другому клиенту`, {
                    reason: REQUEST_STATUS.DENIED
                });
            }
            if (!ORDER_FINAL_STATUSES.some(s => s === dbOrder.currentStatus)) {
                throw createAppError(403, `Статус заказа ${orderLbl} не позволяет его повторить`, {
                    reason: REQUEST_STATUS.DENIED
                });
            }

            const repeatedDbCart: TDbCartItem[] = dbOrder.items.map(item => ({
                productId: item.productId,
                quantity: item.quantity,
                nameSnapshot: item.name,
                brandSnapshot: item.brand ?? null
            }));

            dbUser.cart.splice(0, dbUser.cart.length, ...repeatedDbCart);
            await dbUser.save({ session });
            checkTimeout(req);

            return { orderLbl };
        });

        safeSendResponse(res, 200, {
            message: `Товары из заказа ${orderLbl} повторно добавлены в корзину`
        });
    } catch (err) {
        next(err);
    }
};

/// Изменение внутренней заметки заказа (SSE) ///
export const handleOrderInternalNoteUpdateRequest: RequestHandler<
    IOrderParams,
    TOrderInternalNoteUpdateResponse,
    IOrderInternalNoteUpdateBody
> = async (req, res, next) => {
    // Предварительная проверка формата данных
    const orderId = req.params.orderId;
    const { internalNote } = req.body;

    try {
        const transactionResult = await runInDbTransaction(async (session) => {
            const dbOrder = await OrderFinal.findById(orderId).session(session);
            checkTimeout(req);

            const orderLbl = dbOrder?.orderNumber ? `№${dbOrder.orderNumber}` : `(ID: ${orderId})`;
    
            if (!dbOrder) {
                throw createAppError(404, `Заказ ${orderLbl} не найден`);
            }
    
            // Подготовка данных и проверка на изменение
            const prepDbFields = { internalNote: internalNote?.trim() || null };
            dbOrder.set(prepDbFields);
                    
            if (!dbOrder.isModified()) {
                throw createAppError(204);
            }
    
            // Сохранение заказа
            await dbOrder.save({ session });
            checkTimeout(req);

            // Формирование данных для SSE-сообщения
            const orderPatches = [{ path: 'internalNote', value: prepDbFields.internalNote }];
            const orderUpdateData = { orderPatches };

            return { orderUpdateData, orderLbl };
        });

        const { orderUpdateData, orderLbl } = transactionResult;

        // Отправка SSE-сообщения админам
        const sseMessageData = { orderUpdate: { orderId, orderUpdateData } };
        sseOrderManagement.sendToAllClients(sseMessageData);

        safeSendResponse(res, 200, { message: `Внутренняя заметка заказа ${orderLbl} изменена` });
    } catch (err) {
        next(err);
    }
};

/// Изменение деталей подтверждённого заказа (SSE) ///
export const handleOrderDetailsUpdateRequest: RequestHandler<
    IOrderParams,
    TOrderDetailsUpdateResponse,
    IOrderDetailsUpdateBody
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const dbUser = req.dbUser;
    if (!requireRole(dbUser, USER_ROLE.ADMIN, next)) return;

    const orderId = req.params.orderId;
    const { deliveryMethod, allowCourierExtra, city, street, house, editReason } = req.body;

    // Создание объекта с дотнотационными путями в ключах для обновляемых полей
    const dotNotatedUpdateFields: TOrderDetailsUpdateDotNotatedFields = {};

    for (const [key, value] of (Object.entries(req.body) as [string, TOrderDetailsUpdateBodyValues][])) {
        if (isObjectKey(key, orderDotNotationMap) && value !== undefined) {
            dotNotatedUpdateFields[orderDotNotationMap[key]] = value;
        }
    }

    // Проверка, есть ли хоть одно обновляемое поле
    if (!Object.keys(dotNotatedUpdateFields).length) {
        return safeSendResponse(res, 204);
    }

    // Проверка на согласованность данных для метода курьерской доставки
    const isCourierMethod = deliveryMethod === DELIVERY_METHOD.COURIER;
    const isAllowCourierExtra = allowCourierExtra !== undefined;
    
    if (
        (isCourierMethod && !isAllowCourierExtra) ||
        (deliveryMethod !== undefined && !isCourierMethod && isAllowCourierExtra)
    ) {
        return safeSendResponse(res, 400, { message: 'Несогласованные данные для метода доставки' });
    }

    // Проверка на обязательность полей для адресных методов доставки
    const isAddressDelivery = [
        DELIVERY_METHOD.COURIER,
        DELIVERY_METHOD.TRANSPORT_COMPANY
    ].some(method => method === deliveryMethod);

    if (isAddressDelivery) {
        const requiredAddressFields = { city, street, house };
        const missingAddressFields = Object.entries(requiredAddressFields)
            .filter(([_, value]) => !value)
            .map(([field]) => field);

        if (missingAddressFields.length > 0) {
            return safeSendResponse(res, 400, {
                message:
                    'Для выбранного метода доставки отсутствуют обязательные поля адреса: ' +
                    `[${missingAddressFields.join(', ')}]`
            });
        }
    }

    try {
        const { orderLbl, orderUpdateData } = await runInDbTransaction(async (session) => {
            const dbOrder = await OrderFinal.findById(orderId).session(session);
            checkTimeout(req);

            const orderLbl = dbOrder?.orderNumber ? `№${dbOrder.orderNumber}` : `(ID: ${orderId})`;
            
            if (!dbOrder) {
                throw createAppError(404, `Заказ ${orderLbl} не найден`);
            }
            if (dbOrder.currentStatus !== ORDER_STATUS.CONFIRMED) {
                throw createAppError(409, `На данном этапе заказ ${orderLbl} изменить невозможно`);
            }

            // Объединение нормализованных изменённых полей с существующими через дот-нотацию
            const currentOrder: TDbOrderFinal = dbOrder.toObject();
            const normalizedDotNotatedUpdateFields: TOrderDetailsUpdateNormalizedFields =
                normalizeInputDataToNull(dotNotatedUpdateFields);
            const newOrderData: Partial<TDbOrderFinal> =
                dotNotationToObject(normalizedDotNotatedUpdateFields);
            const mergedOrder: TDbOrderFinal =
                deepMergeNewNullable(currentOrder, newOrderData);

            if (deliveryMethod !== undefined || isAllowCourierExtra) {
                mergedOrder.delivery.shippingCost = prepareShippingCost(
                    deliveryMethod ?? mergedOrder.delivery.deliveryMethod,
                    allowCourierExtra
                );
            }

            // Очистка данных для методов доставки
            if (deliveryMethod === DELIVERY_METHOD.SELF_PICKUP) {
                mergedOrder.delivery.allowCourierExtra = null;
                mergedOrder.delivery.shippingAddress = undefined;
            }
            if (deliveryMethod === DELIVERY_METHOD.TRANSPORT_COMPANY) {
                mergedOrder.delivery.allowCourierExtra = null;
            }

            // Сбор данных изменения полей
            const updateZones: (keyof TDbOrderFinal)[] = ['customerInfo', 'delivery', 'financials'];
            const fieldsPreserveNull = [orderDotNotationMap.shippingCost]; // Поля с валидным null-значением
            const currencyFields = [orderDotNotationMap.shippingCost]; // Поля со значением валюты
            let changes: IOrderDataChange[] = [];

            for (const zone of updateZones) {
                changes = collectDbChanges(
                    currentOrder[zone],
                    mergedOrder[zone],
                    zone, // Для параметра path в collectDbChanges
                    fieldsPreserveNull,
                    currencyFields,
                    changes
                );
            }

            // Проверка на изменение полей
            if (!changes.length) {
                throw createAppError(204);
            }

            // Добавление записи для аудита
            const auditLog: TDbOrderAuditLogEntry[] = [...(currentOrder.auditLog ?? [])];

            auditLog.push({
                changes: changes as TDbOrderAuditLogEntry['changes'],
                reason: editReason,
                changedBy: { id: dbUser._id, name: dbUser.name, role: dbUser.role },
                changedAt: new Date()
            });

            mergedOrder.auditLog = auditLog as TDbOrderFinal['auditLog'];

            // Установка через set и сохранение через save для удаления null-полей и пустых объектов
            dbOrder.set(mergedOrder);
            const updatedDbOrder = await dbOrder.save({ session });
            checkTimeout(req);

            // Формирование данных для SSE-сообщения
            const orderPatches = changes.map(({ field, newValue }) => ({ path: field, value: newValue }));
            const newAuditLogEntry = updatedDbOrder.auditLog?.at(-1)?.toObject();

            const orderUpdateData = {
                orderPatches,
                ...(newAuditLogEntry && { newAuditLogEntry: prepareAuditLogEntry(newAuditLogEntry) })
            };

            return { orderLbl, orderUpdateData };
        });

        // Отправка SSE-сообщения админам
        const sseMessageData = { orderUpdate: { orderId, orderUpdateData } };
        sseOrderManagement.sendToAllClients(sseMessageData);

        safeSendResponse(res, 200, { message: `Заказ ${orderLbl} успешно изменён` });
    } catch (err) {
        next(err);
    }
};

/// Изменение товаров подтверждённого заказа (SSE) ///
export const handleOrderItemsUpdateRequest: RequestHandler<
    IOrderParams,
    TOrderItemsUpdateResponse,
    IOrderItemsUpdateBody
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const dbUser = req.dbUser;
    if (!requireRole(dbUser, USER_ROLE.ADMIN, next)) return;

    const reqCtx = req.reqCtx;
    const orderId = req.params.orderId;
    const { items, editReason } = req.body;

    // Проверка длины и содержимого массива items
    if (!items.length) {
        return safeSendResponse(res, 204);
    }

    try {
        let imageFilenamesToDelete: string[] = [];

        const transactionResult = await runInDbTransaction(async (session) => {
            const dbOrder = await OrderFinal.findById(orderId).session(session);
            checkTimeout(req);

            const orderLbl = dbOrder?.orderNumber ? `№${dbOrder.orderNumber}` : `(ID: ${orderId})`;
            
            if (!dbOrder) {
                throw createAppError(404, `Заказ ${orderLbl} не найден`);
            }
            if (dbOrder.currentStatus !== ORDER_STATUS.CONFIRMED) {
                throw createAppError(409, `На данном этапе заказ ${orderLbl} изменить невозможно`);
            }

            // Обработка изменения количества товаров в заказе
            const updatedOrder = dbOrder.toObject();

            const {
                updatedItems,
                changes,
                itemAdjustments,
                orderItemsDeltaQty,
                imageFilenamesToDelete: collectedImageFilenamesToDelete
            } = await processOrderItemsUpdate(items, updatedOrder);

            imageFilenamesToDelete = collectedImageFilenamesToDelete;

            if (changes.length > 0) { // Есть изменения
                // Пересчёт сумм и проверка минимальной суммы заказа
                const orderTotals = calculateOrderTotals(updatedItems, { confirmed: true });

                if (orderTotals.totalAmount < MIN_ORDER_AMOUNT) {
                    throw createAppError<TOrderItemsUpdateResponse, 422, typeof REQUEST_STATUS.LIMITATION>(
                        422,
                        `Сумма заказа ${orderLbl} меньше минимальной`,
                        {
                            reason: REQUEST_STATUS.LIMITATION,
                            orderItemAdjustments: itemAdjustments
                        }
                    );
                }

                // Изменение количества товаров на складе
                await applyProductBulkUpdate(orderItemsDeltaQty, ORDER_ADJUSTMENT_TYPE.ADJUST, session);
                checkTimeout(req);

                // Сбор данных для логов изменения сумм
                (Object.entries(updatedOrder.totals) as [keyof typeof updatedOrder.totals, number][])
                    .forEach(([field, oldValue]) => {
                        const newValue = orderTotals[field];
                        if (oldValue === newValue) return;

                        changes.push({
                            field: orderDotNotationMap[field],
                            oldValue,
                            newValue,
                            currency: true
                        });
                    });

                // Пересчёт финансового статуса заказа
                const netPaid = updatedOrder.financials.totalPaid - updatedOrder.financials.totalRefunded;
                const currentFinancialsState = updatedOrder.financials.state;
                const newFinancialsState = getFinancialsState(
                    updatedOrder.currentStatus,
                    netPaid,
                    orderTotals.totalAmount,
                    updatedOrder.financials.eventHistory
                );

                // Фиксирование изменений в заказе
                if (newFinancialsState !== currentFinancialsState) {
                    changes.push({
                        field: orderDotNotationMap.financialsState,
                        oldValue: currentFinancialsState,
                        newValue: newFinancialsState
                    });
                    updatedOrder.financials.state = newFinancialsState;
                }

                updatedOrder.totals = orderTotals;
                updatedOrder.items.splice(0, updatedOrder.items.length, ...updatedItems);
            } else { // Нет изменений
                // Есть корректировки изменений
                if (itemAdjustments.length > 0) {
                    throw createAppError<TOrderItemsUpdateResponse, 412>(
                        412,
                        `Заказ ${orderLbl} не изменён в связи с корректировками`,
                        { orderItemAdjustments: itemAdjustments }
                    );
                }

                // Нет ни изменений, ни корректровок
                throw createAppError(204);
            }

            // Добавление записи для аудита
            const auditLog: TDbOrderAuditLogEntry[] = [...updatedOrder.auditLog ?? []];
            auditLog.push({
                changes: changes as TDbOrderAuditLogEntry['changes'],
                reason: editReason,
                changedBy: { id: dbUser._id, name: dbUser.name, role: dbUser.role },
                changedAt: new Date()
            });
            updatedOrder.auditLog = auditLog as TDbOrderFinal['auditLog'];

            // Установка через set и сохранение через save для удаления null-полей и пустых объектов
            dbOrder.set(updatedOrder);
            const updatedDbOrder = await dbOrder.save({ session });
            checkTimeout(req);

            // Формирование данных для SSE-сообщения
            const orderPatches = changes.map(({ field, newValue }) => ({ path: field, value: newValue }));
            const newAuditLogEntry = updatedDbOrder.auditLog?.at(-1)?.toObject();

            const orderUpdateData = {
                orderPatches,
                ...(newAuditLogEntry && { newAuditLogEntry: prepareAuditLogEntry(newAuditLogEntry) })
            };

            return { orderLbl, orderUpdateData, itemAdjustments };
        });

        const { orderLbl, orderUpdateData, itemAdjustments } = transactionResult;

        // Отправка SSE-сообщения админам
        const sseMessageData = { orderUpdate: { orderId, orderUpdateData } };
        sseOrderManagement.sendToAllClients(sseMessageData);

        // Отправка ответа клиенту
        safeSendResponse(res, 200, {
            message: `Заказ ${orderLbl} успешно изменён`,
            orderItemAdjustments: itemAdjustments
        });

        // Удаление миниатюр фотографий товаров в заказе при удалении товаров (безопасно)
        if (imageFilenamesToDelete.length > 0) {
            storageService.deleteOrderItemsImages(orderId, imageFilenamesToDelete, reqCtx);
        }
    } catch (err) {
        next(err);
    }
};

/// Изменение статуса заказа (SSE) ///
export const handleOrderStatusUpdateRequest: RequestHandler<
    IOrderParams,
    TOrderStatusUpdateResponse,
    IOrderStatusUpdateBody
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const dbUser = req.dbUser;
    if (!requireRole(dbUser, USER_ROLE.ADMIN, next)) return;

    const orderId = req.params.orderId;
    const { action, formFields } = req.body;
    const { shippingCost, cancellationReason } = formFields ?? {};

    try {
        // Транзакция MongoDB
        const transactionResult = await runInDbTransaction(async (session) => {
            // Поиск и проверка наличия документа заказа
            const dbOrder = await OrderFinal.findById(orderId).session(session);
            checkTimeout(req);

            const orderLbl = dbOrder?.orderNumber ? `№${dbOrder.orderNumber}` : `(ID: ${orderId})`;

            if (!dbOrder) {
                throw createAppError(404, `Заказ ${orderLbl} не найден`);
            }

            // Проверка разрешения операций для текущего статуса
            const currentOrderStatus = dbOrder.currentStatus;

            if (!ORDER_ACTIVE_STATUSES.some(s => s === currentOrderStatus)) {
                throw createAppError(409, `Заказ ${orderLbl} не активен`);
            }

            // Обработка действий (action) - сбор новых данных, проверка, валидация
            const deliveryMethod = dbOrder.delivery.deliveryMethod;
            const currentShippingCost = dbOrder.delivery.shippingCost;
            const totalAmount = dbOrder.totals.totalAmount;
            const currentFinancialsState = dbOrder.financials.state;
            const financialsEventHistory = dbOrder.financials.eventHistory;

            const { totalPaid, totalRefunded } = calculateOrderFinancials(financialsEventHistory);
            const netPaid = totalPaid - totalRefunded;

            const newDbStatusHistoryEntry: TDbOrderStatusHistoryEntry = {
                status: currentOrderStatus,
                changedBy: { id: dbUser._id, name: dbUser.name, role: dbUser.role },
                changedAt: new Date()
            };

            const invalidFields: TEntityField<'order'>[] = [];
            let newShippingCost = currentShippingCost;

            switch (action) {
                case ORDER_ACTION.NEXT: {
                    // Проверка минимальной суммы заказа
                    if (totalAmount < MIN_ORDER_AMOUNT) {
                        throw createAppError<
                            TOrderStatusUpdateResponse,
                            422,
                            typeof REQUEST_STATUS.LIMITATION
                        >(422, `Сумма заказа ${orderLbl} меньше минимальной`, {
                            reason: REQUEST_STATUS.LIMITATION
                        });
                    }

                    // Получение нового статуса
                    const {
                        newOrderStatus
                    } = getOrderStatusTransitionData(deliveryMethod, currentOrderStatus, 1);

                    // Проверка оплаты заказа при изменении статуса на COMPLETED
                    if (
                        newOrderStatus === ORDER_STATUS.COMPLETED &&
                        !isEqualCurrency(netPaid, totalAmount) &&
                        netPaid < totalAmount
                    ) {
                        throw createAppError(403, `Запрещено: заказ ${orderLbl} ещё не оплачен`);
                    }

                    // Установка статуса
                    newDbStatusHistoryEntry.status = newOrderStatus;

                    // Обработка нового статуса DELIVERED
                    if (newOrderStatus === ORDER_STATUS.DELIVERED) {
                        // Проверка наличия стоимости за доставку при изменении статуса на DELIVERED
                        if (shippingCost === undefined || shippingCost < 0) {
                            invalidFields.push('shippingCost');
                        }

                        // Выход сразу для формирования ошибок невалидных полей в ответе
                        if (invalidFields.length > 0) break;

                        // Изменение стоимости доставки
                        newShippingCost = shippingCost;
                    }

                    break;
                }

                case ORDER_ACTION.ROLLBACK: {
                    // Получение нового статуса и флага для текущего статуса
                    const {
                        newOrderStatus,
                        rollbackAllowed
                    } = getOrderStatusTransitionData(deliveryMethod, currentOrderStatus, -1);
                    
                    // Проверка возможности отката для текущего статуса
                    if (!rollbackAllowed) {
                        throw createAppError(400, `Текущий статус заказа ${orderLbl} откатить нельзя`);
                    }

                    // Установка статуса и флага отката
                    newDbStatusHistoryEntry.status = newOrderStatus;
                    newDbStatusHistoryEntry.isRollback = true;

                    // Сброс стоимости доставки при возврате на статусе DELIVERED
                    const allowCourierExtra = dbOrder.delivery.allowCourierExtra ?? undefined;

                    if (
                        currentOrderStatus === ORDER_STATUS.DELIVERED &&
                        (deliveryMethod !== DELIVERY_METHOD.COURIER || allowCourierExtra)
                    ) {
                        newShippingCost = prepareShippingCost(deliveryMethod, allowCourierExtra);
                    }

                    break;
                }

                case ORDER_ACTION.CANCEL: {
                    // Установка нового статуса
                    newDbStatusHistoryEntry.status = ORDER_STATUS.CANCELLED;

                    // Проверка наличия причины отмены заказа
                    const trimmedCancellationReason = cancellationReason?.trim();
                    if (!trimmedCancellationReason) {
                        invalidFields.push('cancellationReason');
                    }

                    // Выход сразу для формирования ошибок невалидных полей в ответе
                    if (invalidFields.length > 0) break;

                    // Установка причины отмены
                    newDbStatusHistoryEntry.cancellationReason = trimmedCancellationReason;

                    // Удаление уточняющейся стоимости доставки
                    if (currentShippingCost === null) {
                        newShippingCost = undefined;
                    }
                    
                    break;
                }

                default:
                    throw createAppError(400, `Действие не поддерживается: ${action}`);
            }

            // Сбор ошибок для невалидных полей и отправка их в ответе
            if (invalidFields.length > 0) {
                throw createAppError<TOrderStatusUpdateResponse, 422, typeof REQUEST_STATUS.INVALID>(
                    422,
                    'Некорректные данные',
                    { fieldErrors: getFieldErrors(invalidFields, 'order') }
                );
            }

            // Проверка изменения статуса заказа
            if (newDbStatusHistoryEntry.status === currentOrderStatus) {
                throw createAppError(400, `Статус заказа ${orderLbl} не изменился`);
            }

            // Проверка допустимого статуса для подтверждённого заказа
            if (newDbStatusHistoryEntry.status === ORDER_STATUS.DRAFT) {
                throw createAppError(500, `Недопустимый статус заказа: ${newDbStatusHistoryEntry.status}`);
            }

            // Установка нового финансового состояния
            const newFinancialsState = getFinancialsState(
                newDbStatusHistoryEntry.status,
                netPaid,
                totalAmount,
                financialsEventHistory
            );

            // Сбор изменений в полях и установка новых значений в документ
            const changes: IOrderDataChange[] = [];

            // Проверка стоимости доставки
            if (newShippingCost !== currentShippingCost) {
                changes.push({
                    field: orderDotNotationMap.shippingCost,
                    oldValue: currentShippingCost,
                    newValue: newShippingCost,
                    currency: true
                });
                dbOrder.delivery.shippingCost = newShippingCost;
            }

            // Проверка финансового состояния
            if (newFinancialsState !== currentFinancialsState) {
                changes.push({
                    field: orderDotNotationMap.financialsState,
                    oldValue: currentFinancialsState,
                    newValue: newFinancialsState
                });
                dbOrder.financials.state = newFinancialsState;
            }

            if (changes.length > 0) {
                newDbStatusHistoryEntry.changes = changes as TDbOrderStatusHistoryEntry['changes'];
            }

            dbOrder.currentStatus = newDbStatusHistoryEntry.status;
            dbOrder.lastActivityAt = newDbStatusHistoryEntry.changedAt;
            dbOrder.statusHistory.push(newDbStatusHistoryEntry);
            
            // Сохранение докумета
            const updatedDbOrder = await dbOrder.save({ session });
            checkTimeout(req);

            // Обновление общей суммы оплат покупателя при завершении заказа
            if (updatedDbOrder.currentStatus === ORDER_STATUS.COMPLETED) {
                await updateCustomerTotalSpent(updatedDbOrder.customerId, netPaid, session, req.reqCtx);
                checkTimeout(req);
            }

            // Возвращение заказанного количества товаров на склад при отмене заказа
            if (updatedDbOrder.currentStatus === ORDER_STATUS.CANCELLED) {
                await returnProductsToStore(updatedDbOrder.items, session);
                checkTimeout(req);
            }

            // Формирование данных для SSE-сообщения
            const orderPatches = changes.map(({ field, newValue }) => ({ path: field, value: newValue }));
            const newOrderStatusEntry = updatedDbOrder.statusHistory?.at(-1)?.toObject();

            const lastActiveStatus =
                newOrderStatusEntry && updatedDbOrder.currentStatus === ORDER_STATUS.CANCELLED
                    ? getLastActiveOrderStatus(updatedDbOrder.statusHistory.toObject())
                    : undefined;

            const orderUpdateData = {
                ...(orderPatches.length > 0 && { orderPatches }),
                ...(newOrderStatusEntry && {
                    newOrderStatusEntry: prepareOrderStatusEntry(newOrderStatusEntry, lastActiveStatus)
                })
            };

            return { orderLbl, orderUpdateData };
        });

        const { orderLbl, orderUpdateData } = transactionResult;
        const newOrderStatus = orderUpdateData.newOrderStatusEntry?.status;

        // Отправка SSE-сообщения админам
        const sseMessageData = {
            orderUpdate: { orderId, orderUpdateData },
            ...(newOrderStatus && ORDER_FINAL_STATUSES.some(s => s === newOrderStatus) && {
                newActiveOrdersChange: -1
            })
        };
        sseOrderManagement.sendToAllClients(sseMessageData);

        // Отправка ответа заказчику
        safeSendResponse(res, 200, {
            message: `Статус заказа ${orderLbl} успешно изменён: ${newOrderStatus}`
        });
    } catch (err) {
        next(err);
    }
};
