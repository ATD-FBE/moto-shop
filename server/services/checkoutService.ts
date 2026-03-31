import { type ClientSession } from 'mongoose';
import Product from '@server/db/models/Product.js';
import {
    buildProductInventoryUpdatePipeline,
    applyProductBulkUpdate,
    prepareProduct
} from './productService.js';
import { ORDER_RESERVE_BATCH_SIZE, ORDER_ADJUSTMENT_TYPE } from '@server/config/constants.js';
import { getAppliedDiscountData } from '@shared/commonHelpers.js';
import type {
    TDbOrderDraftItem,
    TDbCartItem,
    TDbProduct,
    IOrderItemRef,
    ISyncCartResult,
    ISyncOrderDraftResult
} from '@server/types/index.js';
import type { ICartItemSnapshot, IOrderAdjustments } from '@shared/types/index.js';

export const reserveProducts = async (
    remainingDbOrderItemsToReserve: TDbOrderDraftItem[],
    session: ClientSession
): Promise<Set<string>> => {
    const failedItemIdsSet: Set<string> = new Set();

    // Резервирование количества товаров порциями
    for (let i = 0; i < remainingDbOrderItemsToReserve.length; i += ORDER_RESERVE_BATCH_SIZE) {
        const batch = remainingDbOrderItemsToReserve.slice(i, i + ORDER_RESERVE_BATCH_SIZE);

        await Promise.all(batch.map(async (item) => {
            const updateResult = await Product.updateOne(
                {
                    _id: item.productId,
                    $expr: { // Проверка доступности товара (stock - reserved >= quantity)
                        $gte: [{ $subtract: ['$stock', '$reserved'] }, item.quantity]
                    }
                },
                buildProductInventoryUpdatePipeline(ORDER_ADJUSTMENT_TYPE.RESERVE, item.quantity),
                { session }
            );

            // Изменения не сохраняются, если товар не доступен => Запоминание ID товара
            if (!updateResult.modifiedCount) {
                failedItemIdsSet.add(item.productId.toString());
            }
        }));
    }

    return failedItemIdsSet;
};

export const releaseReservedProducts = async (
    orderItemList: IOrderItemRef[],
    session: ClientSession
): Promise<void> => {
    await applyProductBulkUpdate(orderItemList, ORDER_ADJUSTMENT_TYPE.RELEASE, session);
};

export const commitProductPurchase = async (
    orderItemList: IOrderItemRef[],
    session: ClientSession
): Promise<void> => {
    await applyProductBulkUpdate(orderItemList, ORDER_ADJUSTMENT_TYPE.COMMIT, session);
};

export const syncCart = async (
    cartItemList: TDbCartItem[],
    cartItemSnapshotMap: Map<string, ICartItemSnapshot>,
    customerDiscount: number
): Promise<ISyncCartResult> => {
    const productIds = cartItemList.map(item => item.productId);
    const dbProducts = productIds.length > 0
        ? await Product.find({ _id: { $in: productIds } }).lean<TDbProduct[]>()
        : [];

    // Сбор актуальных данных, исправление корзины и заказа, сбор изменений для логов 
    const dbProductMap = new Map(dbProducts.map(prod => [prod._id.toString(), prod]));
    const now = Date.now();

    return cartItemList.reduce(
        (acc: ISyncCartResult, cartItem: TDbCartItem): ISyncCartResult => {
            const productObjectId = cartItem.productId;
            const productId = productObjectId.toString();
            const productSnapshot = cartItemSnapshotMap.get(productId);
            const dbProduct = dbProductMap.get(productId);
            const adjustments: IOrderAdjustments['adjustments'] = {};

            // Отсеивание удалённого из магазина товара
            if (!dbProduct) {
                adjustments.deleted = true;
                acc.orderAdjustments.push({ productId, adjustments });
                return acc;
            }

            // Отсеивание неактивного товара
            if (!dbProduct.isActive) {
                adjustments.inactive = true;
                acc.orderAdjustments.push({ productId, adjustments });
                return acc;
            }

            // Отсеивание закончившегося на складе товара
            const available = Math.max(0, dbProduct.stock - dbProduct.reserved);

            if (available === 0) {
                adjustments.outOfStock = true;
                acc.orderAdjustments.push({ productId, adjustments });
                return acc;
            }

            // Изменение количества товара
            const correctedQuantity = Math.min(cartItem.quantity, available);

            if (correctedQuantity < cartItem.quantity) {
                adjustments.quantityReduced = {
                    old: cartItem.quantity,
                    corrected: correctedQuantity
                };
            }

            // Изменение цены товара
            if (productSnapshot && dbProduct.price !== productSnapshot.priceSnapshot) {
                adjustments.price = {
                    old: productSnapshot.priceSnapshot,
                    corrected: dbProduct.price
                };
            }

            // Изменение скидки
            const {
                appliedDiscount,
                appliedDiscountSource
            } = getAppliedDiscountData(dbProduct.discount, customerDiscount);

            if (
                productSnapshot &&
                (
                    appliedDiscount !== productSnapshot.appliedDiscountSnapshot ||
                    appliedDiscountSource !== productSnapshot.appliedDiscountSourceSnapshot
                )
            ) {
                adjustments.discount = {
                    old: productSnapshot.appliedDiscountSnapshot,
                    corrected: appliedDiscount,
                    appliedDiscountSourceSnapshot: appliedDiscountSource
                };
            }

            if (Object.keys(adjustments).length > 0) {
                acc.orderAdjustments.push({ productId, adjustments });
            }

            // Сбор данных для сохранения корзины и заказа, а также для отправки клиенту
            acc.fixedDbCart.push({
                productId: productObjectId,
                quantity: correctedQuantity,
                nameSnapshot: dbProduct.name,
                ...(dbProduct.brand && { brandSnapshot: dbProduct.brand }) // Опционально
            });
            acc.fixedDbOrderItems.push({
                productId: productObjectId,
                quantity: correctedQuantity,
                quantitySnapshot: correctedQuantity,
                priceSnapshot: dbProduct.price,
                appliedDiscountSnapshot: appliedDiscount,
                appliedDiscountSourceSnapshot: appliedDiscountSource
            });
            acc.purchaseProductList.push(prepareProduct(dbProduct, { now }));
            acc.cartItemList.push({
                id: productId,
                quantity: correctedQuantity,
                quantityReduced: false,
                outOfStock: false,
                inactive: false,
                deleted: false
            });
            
            return acc;
        },
        {
            fixedDbCart: [],
            fixedDbOrderItems: [],
            orderAdjustments: [],
            purchaseProductList: [],
            cartItemList: []
        }
    );
};

export const syncOrderDraft = async (
    dbOrderItemList: TDbOrderDraftItem[],
    customerDiscount: number
): Promise<ISyncOrderDraftResult> => {
    const productIds = dbOrderItemList.map(item => item.productId);
    const dbProducts = productIds.length > 0
        ? await Product.find({ _id: { $in: productIds } }).lean<TDbProduct[]>()
        : [];

    // Сбор актуальных данных, исправление корзины и заказа, сбор изменений для логов 
    const dbProductMap = new Map(dbProducts.map(prod => [prod._id.toString(), prod]));
    const now = Date.now();

    return dbOrderItemList.reduce(
        (acc: ISyncOrderDraftResult, orderItem: TDbOrderDraftItem): ISyncOrderDraftResult => {
            const productObjectId = orderItem.productId;
            const productId = productObjectId.toString();
            const dbProduct = dbProductMap.get(productId);
            const adjustments: IOrderAdjustments['adjustments'] = {};

            // Отсеивание удалённого из магазина товара
            if (!dbProduct) {
                adjustments.deleted = true;
                acc.orderAdjustments.push({ productId, adjustments });
                return acc;
            }

            // Отсеивание неактивного товара
            if (!dbProduct.isActive) {
                adjustments.inactive = true;
                acc.orderAdjustments.push({ productId, adjustments, releaseQuantity: orderItem.quantity });
                return acc;
            }

            // Отсеивание закончившегося на складе товара
            if (orderItem.quantity <= 0) {
                adjustments.outOfStock = true;
                acc.orderAdjustments.push({ productId, adjustments });
                return acc;
            }

            // Изменение количества товара
            if (orderItem.quantity !== orderItem.quantitySnapshot) {
                adjustments.quantityReduced = {
                    old: orderItem.quantitySnapshot,
                    corrected: orderItem.quantity
                };
            }

            // Изменение цены товара
            if (dbProduct.price !== orderItem.priceSnapshot) {
                adjustments.price = {
                    old: orderItem.priceSnapshot,
                    corrected: dbProduct.price
                };
            }

            // Изменение скидки
            const {
                appliedDiscount,
                appliedDiscountSource
            } = getAppliedDiscountData(dbProduct.discount, customerDiscount);
            
            if (
                appliedDiscount !== orderItem.appliedDiscountSnapshot ||
                appliedDiscountSource !== orderItem.appliedDiscountSourceSnapshot
            ) {
                adjustments.discount = {
                    old: orderItem.appliedDiscountSnapshot,
                    corrected: appliedDiscount,
                    appliedDiscountSourceSnapshot: appliedDiscountSource
                };
            }

            if (Object.keys(adjustments).length > 0) {
                acc.orderAdjustments.push({ productId, adjustments });
            }

            // Сбор данных для сохранения корзины и заказа, а также для отправки клиенту
            acc.fixedDbCart.push({
                productId: productObjectId,
                quantity: orderItem.quantity,
                nameSnapshot: dbProduct.name,
                ...(dbProduct.brand && { brandSnapshot: dbProduct.brand }) // Опционально
            });
            acc.fixedDbOrderItems.push({
                productId: productObjectId,
                quantity: orderItem.quantity,
                quantitySnapshot: orderItem.quantity,
                priceSnapshot: dbProduct.price,
                appliedDiscountSnapshot: appliedDiscount,
                appliedDiscountSourceSnapshot: appliedDiscountSource
            });
            acc.orderItemList.push({
                productId,
                quantity: orderItem.quantity,
                priceSnapshot: dbProduct.price,
                appliedDiscountSnapshot: appliedDiscount
            });
            acc.purchaseProductList.push(prepareProduct(dbProduct, { now }));
            acc.cartItemList.push({
                id: productId,
                quantity: orderItem.quantity,
                quantityReduced: false,
                outOfStock: false,
                inactive: false,
                deleted: false
            });
            
            return acc;
        },
        {
            fixedDbCart: [],
            fixedDbOrderItems: [],
            orderItemList: [],
            orderAdjustments: [],
            purchaseProductList: [],
            cartItemList: []
        }
    );
};

export const replaceListItemsByKey = <T extends Record<string, any>>(
    originalList: T[],
    updatedList: T[],
    key: string = 'id'
): T[] => {
    const updatedMap = new Map<string, T>(updatedList.map(item => [item[key].toString(), item]));

    // Порядок элементов в списке при их замене сохраняется
    return originalList.map(item => {
        const itemKey = item[key].toString();
        return updatedMap.get(itemKey) ?? item;
    });
};

export const isCartDifferentFromOrder = (
    dbCartItemList: TDbCartItem[],
    dbOrderItemList: TDbOrderDraftItem[]
): boolean => {
    if (dbCartItemList.length !== dbOrderItemList.length) return true;

    const orderItemsMap = new Map<string, TDbOrderDraftItem>(
        dbOrderItemList.map(item => [item.productId.toString(), item])
    );

    for (const cartItem of dbCartItemList) {
        const productId = cartItem.productId.toString();
        const orderItem = orderItemsMap.get(productId);

        if (!orderItem || cartItem.quantity !== orderItem.quantity) {
            return true;
        }
    }

    return false;
};
