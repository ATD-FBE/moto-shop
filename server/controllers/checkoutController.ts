import { OrderDraft, OrderFinal } from '@server/db/models/Order.js';
import Counter from '@server/db/models/Counter.js';
import { ORDER_MODEL_TYPE, ORDER_DRAFT_EXPIRATION } from '@server/config/constants.js';
import { checkTimeout } from '@server/middlewares/timeoutMiddleware.js';
import { storageService } from '@server/services/storage/storageService.js';
import * as sseOrderManagement from '@server/services/sse/sseOrderManagementService.js';
import {
    prepareOrderDraft,
    syncCart,
    syncOrderDraft,
    reserveProducts,
    releaseReservedProducts,
    commitProductPurchase,
    replaceListItemsByKey,
    isCartDifferentFromOrder
} from '@server/services/checkoutService.js';
import {
    calculateOrderTotals,
    orderDotNotationMap,
    prepareShippingCost
} from '@server/services/orderService.js';
import { requireDbUser } from '@server/utils/typeGuards.js';
import {
    normalizeInputDataToNull,
    dotNotationToObject,
    deepMergeNewNullable
} from '@server/utils/normalizeUtils.js';
import { runInDbTransaction } from '@server/utils/dbUtils.js';
import { createAppError } from '@server/utils/errorUtils.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import { isObjectKey } from '@shared/commonHelpers.js';
import {
    MIN_ORDER_AMOUNT,
    DELIVERY_METHOD,
    ORDER_STATUS,
    REQUEST_STATUS
} from '@shared/constants.js';
import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type {
    TDbOrderDraft,
    TDbOrderFinal,
    TDbOrderFinalItem,
    TSelectedFields
} from '@server/types/index.js';
import type {
    TOrderDraftSyncResponse,
    IOrderDraftCreateBody,
    TOrderDraftCreateResponse,
    IOrderDraftUpdateBody,
    TOrderDraftUpdateResponse,
    IOrderDraftConfirmBody,
    TOrderDraftConfirmResponse,
    TOrderDraftDeleteResponse
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface ICheckoutParams extends ParamsDictionary {
    orderId: string;
}

type TOrderDotNotationMapValues = typeof orderDotNotationMap[keyof typeof orderDotNotationMap];
type TOrderDraftUpdateBodyValues = IOrderDraftUpdateBody[keyof IOrderDraftUpdateBody];

type TOrderDraftUpdateDotNotatedFields = {
    [K in TOrderDotNotationMapValues]?: TOrderDraftUpdateBodyValues; 
};
type TOrderDraftUpdateNormalizedFields = {
    [K in TOrderDotNotationMapValues]?: TOrderDraftUpdateBodyValues | null; 
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

/// Синхронизация и загрузка черновика заказа ///
export const handleOrderDraftSyncRequest: RequestHandler<
    ICheckoutParams,
    TOrderDraftSyncResponse
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const dbUser = req.dbUser;
    const customerDiscount = dbUser.discount;
    const orderId = req.params.orderId;
    const orderLbl = `(ID: ${orderId})`;

    try {
        const transactionResult = await runInDbTransaction(async (session) => {
            const dbOrderDraft = await OrderDraft.findById(orderId).session(session);
            checkTimeout(req);

            if (!dbOrderDraft) {
                throw createAppError(404, `Черновик заказа ${orderLbl} не найден`);
            }
            if (dbUser._id.toString() !== dbOrderDraft.customerId.toString()) {
                throw createAppError(403, `Запрещено: заказ ${orderLbl} принадлежит другому клиенту`, {
                    reason: REQUEST_STATUS.DENIED,
                });
            }

            // Заказ просрочен => освобождение резервов и удаление заказа
            if (new Date() >= new Date(dbOrderDraft.expiresAt)) {
                await releaseReservedProducts(dbOrderDraft.items, session);
                checkTimeout(req);

                await dbOrderDraft.deleteOne({ session });
                checkTimeout(req);

                throw createAppError(404, `Черновик заказа ${orderLbl} просрочен`);
            }

            // Товары в корзине и в заказе отличаются => освобождение резервов и удаление заказа
            if (isCartDifferentFromOrder(dbUser.cart, dbOrderDraft.items)) {
                await releaseReservedProducts(dbOrderDraft.items, session);
                checkTimeout(req);

                await dbOrderDraft.deleteOne({ session });
                checkTimeout(req);

                throw createAppError(409, `Состав корзины не совпадает с черновиком заказа ${orderLbl}`);
            }

            const {
                fixedDbCart,
                fixedDbOrderItems,
                tradeProductList,
                cartItemList,
                orderItemAdjustments,
                orderItemList,
                orderItemsToRelease
            } = await syncOrderDraft(dbOrderDraft.items, customerDiscount);
            checkTimeout(req);

            const orderTotals = calculateOrderTotals(fixedDbOrderItems);
            const isTotalAmountUnderMinimum = orderTotals.totalAmount < MIN_ORDER_AMOUNT;

            // Есть изменения в заказываемых товарах (вмешательство админа в каталог)
            if (orderItemAdjustments.length > 0) {
                // Обновление корзины клиента перед выходом
                dbUser.cart.splice(0, dbUser.cart.length, ...fixedDbCart);
                await dbUser.save({ session });
                checkTimeout(req);
                
                // Сумма заказа НЕ меньше минимальной => обработка изменений в черновике заказа
                if (!isTotalAmountUnderMinimum) {
                    // Освобождение резервов для деактивированных товаров в заказе
                    if (orderItemsToRelease.length > 0) {
                        await releaseReservedProducts(orderItemsToRelease, session);
                        checkTimeout(req);
                    }

                    // Обновление черновика заказа с последующим выходом
                    dbOrderDraft.items.splice(0, dbOrderDraft.items.length, ...fixedDbOrderItems);
                    dbOrderDraft.totals = orderTotals;
                    await dbOrderDraft.save({ session });
                    checkTimeout(req);
                }
            }

            // Сумма заказа меньше минимальной => освобождение резервов и удаление заказа
            if (isTotalAmountUnderMinimum) {
                await releaseReservedProducts(dbOrderDraft.items, session);
                checkTimeout(req);

                await dbOrderDraft.deleteOne({ session });
                checkTimeout(req);

                throw createAppError<TOrderDraftSyncResponse, 422>(
                    422,
                    `Сумма заказа ${orderLbl} после синхронизации меньше минимальной`,
                    {
                        reason: REQUEST_STATUS.LIMITATION,
                        tradeProductList,
                        cartItemList,
                        customerDiscount,
                        orderDraft: {
                            items: orderItemList,
                            totals: orderTotals
                        },
                        orderItemAdjustments
                    }
                );
            }

            return {
                tradeProductList,
                cartItemList,
                orderDraft: prepareOrderDraft(dbOrderDraft.toObject(), orderItemList),
                orderItemAdjustments
            };
        });

        const {
            tradeProductList,
            cartItemList,
            orderDraft,
            orderItemAdjustments
        } = transactionResult;

        safeSendResponse(res, 200, {
            message: orderItemAdjustments.length > 0
                ? `Черновик заказа ${orderLbl} синхронизирован с текущими данными каталога`
                : `Черновик заказа ${orderLbl} успешно загружен`,
            tradeProductList,
            cartItemList,
            customerDiscount,
            orderDraft,
            orderItemAdjustments
        });
    } catch (err) {
        next(err);
    }
};

/// Создание черновика заказа ///
export const handleOrderDraftCreateRequest: RequestHandler<
    {},
    TOrderDraftCreateResponse,
    IOrderDraftCreateBody
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const dbUser = req.dbUser;
    const customerId = dbUser._id;
    const customerDiscount = dbUser.discount;
    const { initialOrderItemSnapshots } = req.body;

    // Поиск существующих черновиков, возврат зарезервированных товаров и удаление заказов
    try {
        await runInDbTransaction(async (session) => {
            const selectedFields: TSelectedFields<TDbOrderDraft> = { items: 1 };
            const existingOrderDrafts = await OrderDraft
                .find({ customerId })
                .select(selectedFields)
                .lean<TDbOrderDraft[]>()
                .session(session);
            checkTimeout(req);

            if (existingOrderDrafts.length > 0) {
                const orderItemsToRelease = existingOrderDrafts.flatMap(order => order.items);
                await releaseReservedProducts(orderItemsToRelease, session);
                checkTimeout(req);

                await OrderDraft.deleteMany({ customerId }).session(session);
                checkTimeout(req);
            }
        });
    } catch (err) {
        return next(err);
    }

    // Актуализация данных, резервирование товаров и создание документа черновика заказа
    try {
        const transactionResult = await runInDbTransaction(async (session) => {
            // Автоисправление товаров в заказе, корзине и получение актуальных данных
            let {
                fixedDbCart,
                fixedDbOrderItems,
                cartItemAdjustments,
                tradeProductList,
                cartItemList
            } = await syncCart(dbUser.cart, initialOrderItemSnapshots, customerDiscount);
            checkTimeout(req);

            // Проверка итоговой суммы
            let orderTotals = calculateOrderTotals(fixedDbOrderItems);
            let currentTotal = orderTotals.totalAmount;
            
            if (currentTotal < MIN_ORDER_AMOUNT) {
                // Сохранение корзины пользователя перед выходом, если были изменения
                if (cartItemAdjustments.length > 0) {
                    dbUser.cart.splice(0, dbUser.cart.length, ...fixedDbCart);
                    await dbUser.save({ session });
                    checkTimeout(req);
                }

                throw createAppError<TOrderDraftCreateResponse, 422>(
                    422,
                    'Сумма заказа меньше минимальной',
                    {
                        reason: REQUEST_STATUS.LIMITATION,
                        tradeProductList,
                        cartItemList,
                        customerDiscount,
                        currentTotal,
                        cartItemAdjustments
                    }
                );
            }

            // Резервирование товаров АТОМАРНО, с избежанием гонки при сохранении данных
            let remainingDbOrderItemsToReserve = fixedDbOrderItems.slice(); // Копия заказа

            while (remainingDbOrderItemsToReserve.length) {
                const failedItemIdsSet = await reserveProducts(remainingDbOrderItemsToReserve, session);
                checkTimeout(req);

                // Выход из цикла, если все товары зарезервированы
                if (!failedItemIdsSet.size) break;

                await new Promise(resolve => setTimeout(resolve, 750));
                checkTimeout(req);

                // Не все товары зарезервированы => Повтор сбора данных, проверки суммы и резервирования
                const failedCartItems = dbUser.cart
                    .filter(i => failedItemIdsSet.has(i.productId.toString()));

                // Повтор подготовки данных заказа, только для провальных при резервировании товаров
                const {
                    fixedDbCart: failedFixedDbCart,
                    fixedDbOrderItems: failedFixedDbOrderItems,
                    cartItemAdjustments: failedTradeProductAdjustments,
                    tradeProductList: failedTradeProductList,
                    cartItemList: failedCartItemList
                } = await syncCart(failedCartItems, initialOrderItemSnapshots, customerDiscount);
                checkTimeout(req);

                // Замена в массивах проблемных товаров
                fixedDbCart = replaceListItemsByKey(fixedDbCart, failedFixedDbCart, 'productId');
                fixedDbOrderItems = replaceListItemsByKey(
                    fixedDbOrderItems, failedFixedDbOrderItems, 'productId'
                );
                cartItemAdjustments = replaceListItemsByKey(
                    cartItemAdjustments, failedTradeProductAdjustments, 'id'
                );
                tradeProductList = replaceListItemsByKey(
                    tradeProductList, failedTradeProductList, 'id'
                );
                cartItemList = replaceListItemsByKey(cartItemList, failedCartItemList, 'id');

                // Повтор проверки итоговой суммы
                orderTotals = calculateOrderTotals(fixedDbOrderItems);
                currentTotal = orderTotals.totalAmount;

                if (currentTotal < MIN_ORDER_AMOUNT) {
                    // Сохранение корзины пользователя перед выходом, если были изменения
                    if (cartItemAdjustments.length > 0) {
                        dbUser.cart.splice(0, dbUser.cart.length, ...fixedDbCart);
                        await dbUser.save({ session });
                        checkTimeout(req);
                    }

                    throw createAppError<TOrderDraftCreateResponse, 422>(
                        422,
                        'Сумма заказа меньше минимальной',
                        {
                            reason: REQUEST_STATUS.LIMITATION,
                            tradeProductList,
                            cartItemList,
                            customerDiscount,
                            currentTotal,
                            cartItemAdjustments
                        }
                    );
                }

                // Замена массива остатков для их повторного резервирования
                remainingDbOrderItemsToReserve = failedFixedDbOrderItems;
            }

            // Сохранение корзины пользователя, если были изменения
            if (cartItemAdjustments.length > 0) {
                dbUser.cart.splice(0, dbUser.cart.length, ...fixedDbCart);
                await dbUser.save({ session });
                checkTimeout(req);
            }

            // Создание черновика заказа
            const { customerInfo, delivery, financials } = dbUser.checkoutPrefs ?? {};
            const now = new Date();

            const [dbOrderDraft] = await OrderDraft.create(
                [
                    {
                        customerId,
                        lastActivityAt: now,
                        statusHistory: [{
                            status: ORDER_STATUS.DRAFT,
                            changedBy: { id: customerId, name: dbUser.name, role: dbUser.role },
                            changedAt: now
                        }],
                        items: fixedDbOrderItems,
                        totals: orderTotals,
                        customerInfo,
                        delivery,
                        financials,
                        expiresAt: new Date(now.getTime() + ORDER_DRAFT_EXPIRATION)
                    }
                ],
                { session }
            );
            checkTimeout(req);

            if (!dbOrderDraft) {
                throw createAppError(500, 'Ошибка создания черновика заказа: документ не был возвращен');
            }

            return {
                tradeProductList,
                cartItemList,
                orderId: dbOrderDraft._id.toString(),
                cartItemAdjustments
            };
        });

        const { tradeProductList, cartItemList, orderId, cartItemAdjustments } = transactionResult;

        // Черновик заказа создан - ответ клиенту об успехе
        safeSendResponse(res, 201, {
            message: `Черновик заказа (ID: ${orderId}) успешно создан`,
            tradeProductList,
            cartItemList,
            customerDiscount,
            orderId,
            cartItemAdjustments
        });
    } catch (err) {
        next(err);
    }
};

/// Изменение черновика заказа ///
export const handleOrderDraftUpdateRequest: RequestHandler<
    ICheckoutParams,
    TOrderDraftUpdateResponse,
    IOrderDraftUpdateBody
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const userId = req.dbUser._id;
    const orderId = req.params.orderId;

    // Проверка на согласованность данных для метода курьерской доставки
    const { deliveryMethod, allowCourierExtra } = req.body;
    const isCourierMethod = deliveryMethod === DELIVERY_METHOD.COURIER;
    const isAllowCourierExtra = allowCourierExtra !== undefined;
    
    if (
        (isCourierMethod && !isAllowCourierExtra) ||
        (deliveryMethod !== undefined && !isCourierMethod && isAllowCourierExtra)
    ) {
        return safeSendResponse(res, 400, { message: 'Несогласованные данные для метода доставки' });
    }

    // Создание объекта с дотнотационными путями в ключах для обновляемых полей
    const dotNotatedUpdateFields: TOrderDraftUpdateDotNotatedFields = {};

    for (const [key, value] of (Object.entries(req.body) as [string, TOrderDraftUpdateBodyValues][])) {
        if (isObjectKey(key, orderDotNotationMap) && value !== undefined) {
            dotNotatedUpdateFields[orderDotNotationMap[key]] = value;
        }
    }

    // Проверка, есть ли хоть одно обновляемое поле
    if (!Object.keys(dotNotatedUpdateFields).length) {
        return safeSendResponse(res, 204);
    }
    
    try {
        const orderLbl = `(ID: ${orderId})`;

        await runInDbTransaction(async (session) => {
            // Поиск черновика заказа, полностью удовлетворяющего условиям
            const dbOrderDraft = await OrderDraft.findOne({
                _id: orderId,
                customerId: userId,
                expiresAt: { $gt: new Date() }
            }).session(session);
            checkTimeout(req);

            if (!dbOrderDraft) {
                throw createAppError(404, `Черновик заказа ${orderLbl} не найден или просрочен`);
            }

            // Объединение нормализованных изменённых полей с существующими через дот-нотацию в их названиях
            const currentOrderDraft = dbOrderDraft.toObject();
            const normalizedDotNotatedUpdateFields =
                normalizeInputDataToNull(dotNotatedUpdateFields) as TOrderDraftUpdateNormalizedFields;
            const newOrderDraftData =
                dotNotationToObject(normalizedDotNotatedUpdateFields) as Partial<TDbOrderDraft>;
            const mergedOrderDraft =
                deepMergeNewNullable(currentOrderDraft, newOrderDraftData) as TDbOrderDraft;

            // Очистка данных для методов доставки
            if (mergedOrderDraft.delivery) {
                if (deliveryMethod === '') {
                    mergedOrderDraft.delivery = {};
                }
                if (deliveryMethod === DELIVERY_METHOD.SELF_PICKUP) {
                    mergedOrderDraft.delivery.allowCourierExtra = null;
                    mergedOrderDraft.delivery.shippingAddress = {};
                }
                if (deliveryMethod === DELIVERY_METHOD.TRANSPORT_COMPANY) {
                    mergedOrderDraft.delivery.allowCourierExtra = null;
                }
            }

            // Проверка на изменение полей в этом обработчике не нужна
            // Установка через set и сохранение через save для удаления null-полей и пустых объектов
            dbOrderDraft.set(mergedOrderDraft);
            await dbOrderDraft.save({ session });
            checkTimeout(req);
        });

        safeSendResponse(res, 200, { message: `Черновик заказа ${orderLbl} обновлён` });
    } catch (err) {
        next(err);
    }
};

/// Подтверждение оформления заказа ///
export const handleOrderDraftConfirmRequest: RequestHandler<
    ICheckoutParams,
    TOrderDraftConfirmResponse,
    IOrderDraftConfirmBody
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const reqCtx = req.reqCtx;
    const dbUser = req.dbUser;
    const customerId = dbUser._id;
    const customerDiscount = dbUser.discount;
    const orderId = req.params.orderId;
    const {
        firstName, lastName, middleName, email, phone, deliveryMethod, allowCourierExtra, region,
        district, city, street, house, apartment, postalCode, defaultPaymentMethod, customerComment
    } = req.body;

    // Проверка на согласованность данных для метода курьерской доставки
    const isCourierMethod = deliveryMethod === DELIVERY_METHOD.COURIER;
    const isAllowCourierExtra = allowCourierExtra !== undefined;
    
    if ((isCourierMethod && !isAllowCourierExtra) || (!isCourierMethod && isAllowCourierExtra)) {
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

    let confirmedOrderId: string | null = null;

    try {
        const orderLbl = `(ID: ${orderId})`;
        
        await runInDbTransaction(async (session) => {
            const dbOrderDraft = await OrderDraft.findById(orderId).session(session);
            checkTimeout(req);

            if (!dbOrderDraft) {
                throw createAppError(404, `Черновик заказа ${orderLbl} не найден`);
            }
            if (customerId.toString() !== dbOrderDraft.customerId.toString()) {
                throw createAppError(403, `Запрещено: заказ ${orderLbl} принадлежит другому клиенту`, {
                    reason: REQUEST_STATUS.DENIED,
                });
            }

            // Заказ просрочен => освобождение резервов и удаление заказа
            if (new Date() >= new Date(dbOrderDraft.expiresAt)) {
                await releaseReservedProducts(dbOrderDraft.items, session);
                checkTimeout(req);

                await dbOrderDraft.deleteOne({ session });
                checkTimeout(req);

                throw createAppError(404, `Черновик заказа ${orderLbl} просрочен`);
            }

            // Товары в корзине и в заказе отличаются => освобождение резервов и удаление заказа
            if (isCartDifferentFromOrder(dbUser.cart, dbOrderDraft.items)) {
                await releaseReservedProducts(dbOrderDraft.items, session);
                checkTimeout(req);

                await dbOrderDraft.deleteOne({ session });
                checkTimeout(req);

                throw createAppError(409, `Состав корзины не совпадает с черновиком заказа ${orderLbl}`);
            }

            const {
                fixedDbCart,
                fixedDbOrderItems,
                tradeProductList,
                cartItemList,
                orderItemList,
                orderItemAdjustments,
                orderItemsToRelease
            } = await syncOrderDraft(dbOrderDraft.items, customerDiscount);
            checkTimeout(req);

            const orderTotals = calculateOrderTotals(fixedDbOrderItems);
            const isTotalAmountUnderMinimum = orderTotals.totalAmount < MIN_ORDER_AMOUNT;

            // Есть изменения в заказываемых товарах (вмешательство админа в каталог)
            if (orderItemAdjustments.length > 0) {
                // Обновление корзины клиента перед выходом
                dbUser.cart.splice(0, dbUser.cart.length, ...fixedDbCart);
                await dbUser.save({ session });
                checkTimeout(req);
                
                // Сумма заказа НЕ меньше минимальной => обработка изменений в черновике заказа и выход
                if (!isTotalAmountUnderMinimum) {
                    // Освобождение резервов для деактивированных товаров в заказе
                    if (orderItemsToRelease.length > 0) {
                        await releaseReservedProducts(orderItemsToRelease, session);
                        checkTimeout(req);
                    }

                    // Обновление черновика заказа с последующим выходом
                    dbOrderDraft.items.splice(0, dbOrderDraft.items.length, ...fixedDbOrderItems);
                    dbOrderDraft.totals = orderTotals;
                    await dbOrderDraft.save({ session });
                    checkTimeout(req);

                    throw createAppError<TOrderDraftConfirmResponse, 412>(
                        412,
                        `Данные заказа ${orderLbl} изменены после синхронизации с каталогом`,
                        {
                            tradeProductList,
                            cartItemList,
                            customerDiscount,
                            orderDraft: {
                                items: orderItemList,
                                totals: orderTotals,
                                expiresAt: dbOrderDraft.expiresAt
                            },
                            orderItemAdjustments
                        }
                    );
                }
            }
            
            // Сумма заказа меньше минимальной => освобождение резервов и удаление заказа
            if (isTotalAmountUnderMinimum) {
                await releaseReservedProducts(dbOrderDraft.items, session);
                checkTimeout(req);

                await dbOrderDraft.deleteOne({ session });
                checkTimeout(req);

                throw createAppError<TOrderDraftConfirmResponse, 422, typeof REQUEST_STATUS.LIMITATION>(
                    422,
                    `Сумма заказа ${orderLbl} после синхронизации меньше минимальной`,
                    {
                        reason: REQUEST_STATUS.LIMITATION,
                        tradeProductList,
                        cartItemList,
                        customerDiscount,
                        currentTotal: orderTotals.totalAmount,
                        orderItemAdjustments
                    }
                );
            }

            // Подготовка данных для нового документа
            const { _id: orderDraftId, ...currentOrderDraft } = dbOrderDraft.toObject();

            const shippingCost = prepareShippingCost(deliveryMethod, allowCourierExtra);
            const submittedOrderData = normalizeInputDataToNull({
                customerInfo: { firstName, lastName, middleName, email, phone },
                delivery: {
                    deliveryMethod,
                    allowCourierExtra,
                    shippingAddress: deliveryMethod === DELIVERY_METHOD.SELF_PICKUP
                        ? {}
                        : { region, district, city, street, house, apartment, postalCode },
                    ...(shippingCost !== undefined && { shippingCost })
                },
                financials: { defaultPaymentMethod },
                customerComment
            }) as Partial<TDbOrderFinal>;

            const confirmedOrderData = {
                _modelType: ORDER_MODEL_TYPE.FINAL,
                currentStatus: ORDER_STATUS.CONFIRMED,
                ...submittedOrderData
            };

            // Создание нового документа для дискриминатора final модели Order
            const confirmedOrderDoc = new OrderFinal({ ...currentOrderDraft, ...confirmedOrderData });
            
            // Предварительная валидация до работы с файловой системой и создания номера заказа
            await confirmedOrderDoc.validate({ pathsToSkip: ['orderNumber', 'items', 'confirmedAt'] });
            checkTimeout(req);

            // Подготовка списка товаров подтверждённого заказа
            confirmedOrderId = confirmedOrderDoc._id.toString();
            const tradeProductMap = new Map(tradeProductList.map(prod => [prod.id.toString(), prod]));
            const confirmedOrderItems: TDbOrderFinalItem[] = [];

            for (const orderItem of fixedDbOrderItems) {
                const {
                    productId: productObjectId,
                    quantity,
                    priceSnapshot,
                    appliedDiscountSnapshot,
                    appliedDiscountSourceSnapshot
                } = orderItem;

                const productId = productObjectId.toString();
                const prodLbl = `(ID: ${productId})`;
                const product = tradeProductMap.get(productId);
                if (!product) throw new Error(`Товар ${prodLbl} не найден в tradeProductMap`);

                const { images, mainImageIndex, sku, name, brand, unit } = product;
                const imageFilename = images.length > 0
                    ? (images[mainImageIndex ?? 0] ?? images[0])?.filename
                    : undefined;
                const finalUnitPrice = priceSnapshot * (1 - appliedDiscountSnapshot / 100);
                const totalPrice = finalUnitPrice * quantity;

                confirmedOrderItems.push({
                    productId: productObjectId,
                    imageFilename,
                    sku,
                    name,
                    brand,
                    quantity,
                    unit,
                    originalUnitPrice: priceSnapshot,
                    appliedDiscount: appliedDiscountSnapshot,
                    appliedDiscountSource: appliedDiscountSourceSnapshot,
                    finalUnitPrice: +finalUnitPrice.toFixed(2),
                    totalPrice: +totalPrice.toFixed(2)
                });
            }

            // Сохранение (копирование) файлов миниатюр товара для заказа
            await storageService.saveOrderItemsImages(confirmedOrderId, confirmedOrderItems);
            checkTimeout(req);

            // Получение документа с новым номером заказа (без session: счётчик откатывать нельзя!)
            const dbCounter = await Counter.findOneAndUpdate(
                { entity: 'order' },
                { $inc: { seq: 1 } },
                {
                    new: true,
                    upsert: true // upsert (update + insert) создаёт документ, если его ещё нет
                    // session - Без сессии, чтобы не было очередей ожидания из-за счётчика
                }
            );
            checkTimeout(req);

            const newOrderNumber = dbCounter.seq.toString().padStart(5, '0');

            // Установка номера, списка, статусов и дат
            const now = new Date();
            
            confirmedOrderDoc.orderNumber = newOrderNumber;
            confirmedOrderDoc.items.splice(0, confirmedOrderDoc.items.length, ...confirmedOrderItems);
            confirmedOrderDoc.confirmedAt = now;
            confirmedOrderDoc.lastActivityAt = now;
            confirmedOrderDoc.statusHistory.push({
                status: ORDER_STATUS.CONFIRMED,
                changedBy: { id: customerId, name: dbUser.name, role: dbUser.role },
                changedAt: now
            });

            // Сохранение документа подтверждённого заказа
            await confirmedOrderDoc.save({ session });
            checkTimeout(req);

            // Удаление документа черновика заказа
            await dbOrderDraft.deleteOne({ session });
            checkTimeout(req);

            // Списание резервов товаров в заказе
            await commitProductPurchase(confirmedOrderDoc.items, session);
            checkTimeout(req);

            // Очистка корзины клиента
            dbUser.cart.splice(0);
            await dbUser.save({ session });
            checkTimeout(req);
        });

        // Отправка SSE-сообщения админам
        sseOrderManagement.sendToAllClients({ newActiveOrdersChange: 1 });

        // Отправка ответа заказчику
        safeSendResponse(res, 200, { message: `Заказ ${orderLbl} успешно подтверждён` });
    } catch (err) {
        // Очистка файлов миниатюр товаров в заказе (безопасно)
        storageService.cleanupOrderFiles(confirmedOrderId, reqCtx);

        next(err);
    }
};

/// Отмена оформления заказа ///
export const handleOrderDraftDeleteRequest: RequestHandler<
    ICheckoutParams,
    TOrderDraftDeleteResponse
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const dbUser = req.dbUser;
    const orderId = req.params.orderId;

    try {
        const orderLbl = `(ID: ${orderId})`;

        await runInDbTransaction(async (session) => {
            const dbOrderDraft = await OrderDraft.findById(orderId).session(session);
            checkTimeout(req);

            if (!dbOrderDraft) {
                throw createAppError(404, `Черновик заказа ${orderLbl} не найден`);
            }
            if (dbUser._id.toString() !== dbOrderDraft.customerId.toString()) {
                throw createAppError(403, `Запрещено: заказ ${orderLbl} принадлежит другому клиенту`, {
                    reason: REQUEST_STATUS.DENIED
                });
            }

            await releaseReservedProducts(dbOrderDraft.items, session);
            checkTimeout(req);

            await dbOrderDraft.deleteOne({ session });
            checkTimeout(req);
        });

        safeSendResponse(res, 200, { message: `Черновик заказа ${orderLbl} успешно удалён` });
    } catch (err) {
        next(err);
    }
};
