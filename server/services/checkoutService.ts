import { type ClientSession } from 'mongoose';
import Product from '@server/db/models/Product.js';
import {
    buildProductInventoryUpdatePipeline,
    applyProductBulkUpdate,
    prepareProduct,
    prepareProductSnapshot
} from './productService.js';
import { ORDER_RESERVE_BATCH_SIZE, ORDER_ADJUSTMENT_TYPE } from '@server/config/constants.js';
import { getAppliedDiscountData } from '@shared/commonHelpers.js';
import type {
    TDbUser,
    TDbOrderDraft,
    TDbOrderDraftItem,
    TDbCartItem,
    TDbProduct,
    IOrderItemRef
} from '@server/types/index.js';
import type {
    IProduct,
    IProductAdjustment,
    ICartItem,
    IInitialOrderItemSnapshot,
    IOrderDraft,
    ICheckoutDetails
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

export interface ISyncCartResult {
    fixedDbCart: TDbCartItem[];
    fixedDbOrderItems: TDbOrderDraftItem[];
    tradeProductList: IProduct[];
    cartItemList: ICartItem[];
    cartItemAdjustments: IProductAdjustment[];
}

export interface ISyncOrderDraftResult {
    fixedDbCart: TDbCartItem[];
    fixedDbOrderItems: TDbOrderDraftItem[];
    tradeProductList: IProduct[];
    cartItemList: ICartItem[];
    orderItemList: IOrderDraft['items'];
    orderItemAdjustments: IProductAdjustment[];
    orderItemsToRelease: IOrderItemRef[];
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export const prepareOrderDraft = (
    dbOrderDraft: TDbOrderDraft,
    orderItemList: IOrderDraft['items']
): IOrderDraft => ({
    expiresAt: dbOrderDraft.expiresAt,
    items: orderItemList,
    totals: dbOrderDraft.totals,
    customerInfo: prepareOrderDraftCustomerInfo(dbOrderDraft.customerInfo),
    delivery: prepareOrderDraftDelivery(dbOrderDraft.delivery),
    financials: prepareOrderDraftFinancials(dbOrderDraft.financials),
    customerComment: dbOrderDraft.customerComment ?? undefined
});

export const prepareOrderDraftCustomerInfo = (
    dbCustomerInfo: TDbOrderDraft['customerInfo'] | NonNullable<TDbUser['checkoutPrefs']>['customerInfo']
): ICheckoutDetails['customerInfo'] => {
    if (!dbCustomerInfo) return undefined;

    return {
        firstName: dbCustomerInfo.firstName ?? undefined,
        lastName: dbCustomerInfo.lastName ?? undefined,
        middleName: dbCustomerInfo.middleName ?? undefined,
        email: dbCustomerInfo.email ?? undefined,
        phone: dbCustomerInfo.phone ?? undefined
    };
};

export const prepareOrderDraftDelivery = (
    dbDelivery: TDbOrderDraft['delivery'] | NonNullable<TDbUser['checkoutPrefs']>['delivery']
): ICheckoutDetails['delivery'] => {
    if (!dbDelivery) return undefined;

    return {
        deliveryMethod: dbDelivery.deliveryMethod ?? undefined,
        allowCourierExtra: dbDelivery.allowCourierExtra ?? undefined,
        shippingAddress: dbDelivery.shippingAddress ? {
            region: dbDelivery.shippingAddress.region ?? undefined,
            district: dbDelivery.shippingAddress.district ?? undefined,
            city: dbDelivery.shippingAddress.city ?? undefined,
            street: dbDelivery.shippingAddress.street ?? undefined,
            house: dbDelivery.shippingAddress.house ?? undefined,
            apartment: dbDelivery.shippingAddress.apartment ?? undefined,
            postalCode: dbDelivery.shippingAddress.postalCode ?? undefined,
        } : undefined
    };
};

export const prepareOrderDraftFinancials = (
    dbFinancials: TDbOrderDraft['financials'] | NonNullable<TDbUser['checkoutPrefs']>['financials']
): ICheckoutDetails['financials'] => {
    if (!dbFinancials) return undefined;

    return {
        defaultPaymentMethod: dbFinancials.defaultPaymentMethod ?? undefined,
    };
};

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
    initialOrderItemSnapshots: IInitialOrderItemSnapshot[],
    customerDiscount: number
): Promise<ISyncCartResult> => {
    const productIds = cartItemList.map(item => item.productId);
    const dbProducts = productIds.length > 0
        ? await Product.find({ _id: { $in: productIds } }).lean<TDbProduct[]>()
        : [];

    // Сбор актуальных данных, исправление корзины и заказа, сбор изменений для логов
    const dbProductMap = new Map(dbProducts.map(prod => [prod._id.toString(), prod]));
    const initialOrderItemSnapshotMap = new Map(initialOrderItemSnapshots.map(item => [item.productId, item]));
    const now = Date.now();

    return cartItemList.reduce<ISyncCartResult>(
        (acc, cartItem) => {
            const productObjectId = cartItem.productId;
            const productId = productObjectId.toString();
            const dbProduct = dbProductMap.get(productId);
            const snapshot = initialOrderItemSnapshotMap.get(productId);
            const adjustments: IProductAdjustment['adjustments'] = {};

            const adjustedProductData = {
                id: productId,
                name: dbProduct?.name,
                brand: dbProduct?.brand ?? undefined,
                adjustments
            };

            // Отсеивание удалённого из магазина товара
            if (!dbProduct) {
                adjustments.deleted = true;
                acc.cartItemAdjustments.push(adjustedProductData);
                return acc;
            }

            // Отсеивание неактивного товара
            if (!dbProduct.isActive) {
                adjustments.inactive = true;
                acc.cartItemAdjustments.push(adjustedProductData);
                return acc;
            }

            // Отсеивание закончившегося на складе товара
            const available = Math.max(0, dbProduct.stock - dbProduct.reserved);

            if (available === 0) {
                adjustments.outOfStock = true;
                acc.cartItemAdjustments.push(adjustedProductData);
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
            if (snapshot && dbProduct.price !== snapshot.priceSnapshot) {
                adjustments.price = {
                    old: snapshot.priceSnapshot,
                    corrected: dbProduct.price
                };
            }

            // Изменение скидки
            const {
                appliedDiscount,
                appliedDiscountSource
            } = getAppliedDiscountData(dbProduct.discount, customerDiscount);

            if (
                snapshot &&
                (
                    appliedDiscount !== snapshot.appliedDiscountSnapshot ||
                    appliedDiscountSource !== snapshot.appliedDiscountSourceSnapshot
                )
            ) {
                adjustments.discount = {
                    old: snapshot.appliedDiscountSnapshot,
                    corrected: appliedDiscount,
                    source: appliedDiscountSource
                };
            }

            // Сбор данных для сохранения корзины и заказа, а также для отправки клиенту
            const fixedDbCartItem = {
                productId: productObjectId,
                quantity: correctedQuantity,
                nameSnapshot: dbProduct.name,
                ...(dbProduct.brand && { brandSnapshot: dbProduct.brand }) // Опционально
            };

            acc.fixedDbCart.push(fixedDbCartItem);
            acc.fixedDbOrderItems.push({
                productId: productObjectId,
                quantity: correctedQuantity,
                quantitySnapshot: correctedQuantity,
                priceSnapshot: dbProduct.price,
                appliedDiscountSnapshot: appliedDiscount,
                appliedDiscountSourceSnapshot: appliedDiscountSource
            });
            acc.tradeProductList.push(prepareProduct(dbProduct, { now }));
            acc.cartItemList.push({
                id: productId,
                quantity: correctedQuantity,
                quantityReduced: false,
                outOfStock: false,
                inactive: false,
                deleted: false,
                productSnapshot: prepareProductSnapshot(fixedDbCartItem)
            });

            if (Object.keys(adjustments).length > 0) {
                acc.cartItemAdjustments.push(adjustedProductData);
            }
            
            return acc;
        },
        {
            fixedDbCart: [],
            fixedDbOrderItems: [],
            tradeProductList: [],
            cartItemList: [],
            cartItemAdjustments: []
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

    return dbOrderItemList.reduce<ISyncOrderDraftResult>(
        (acc, orderItem) => {
            const productObjectId = orderItem.productId;
            const productId = productObjectId.toString();
            const dbProduct = dbProductMap.get(productId);
            const adjustments: IProductAdjustment['adjustments'] = {};

            const adjustedProductData = {
                id: productId,
                name: dbProduct?.name,
                brand: dbProduct?.brand ?? undefined,
                adjustments
            };

            // Отсеивание удалённого из магазина товара
            if (!dbProduct) {
                adjustments.deleted = true;
                acc.orderItemAdjustments.push(adjustedProductData);
                return acc;
            }

            // Отсеивание неактивного товара
            if (!dbProduct.isActive) {
                adjustments.inactive = true;
                acc.orderItemAdjustments.push(adjustedProductData);
                acc.orderItemsToRelease.push({ productId, quantity: orderItem.quantity });
                return acc;
            }

            // Отсеивание закончившегося на складе товара
            if (orderItem.quantity <= 0) {
                adjustments.outOfStock = true;
                acc.orderItemAdjustments.push(adjustedProductData);
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
                    source: appliedDiscountSource
                };
            }

            // Сбор данных для сохранения корзины и заказа, а также для отправки клиенту
            const fixedDbCartItem = {
                productId: productObjectId,
                quantity: orderItem.quantity,
                nameSnapshot: dbProduct.name,
                ...(dbProduct.brand && { brandSnapshot: dbProduct.brand }) // Опционально
            };

            acc.fixedDbCart.push(fixedDbCartItem);
            acc.fixedDbOrderItems.push({
                productId: productObjectId,
                quantity: orderItem.quantity,
                quantitySnapshot: orderItem.quantity,
                priceSnapshot: dbProduct.price,
                appliedDiscountSnapshot: appliedDiscount,
                appliedDiscountSourceSnapshot: appliedDiscountSource
            });
            acc.tradeProductList.push(prepareProduct(dbProduct, { now }));
            acc.cartItemList.push({
                id: productId,
                quantity: orderItem.quantity,
                quantityReduced: false,
                outOfStock: false,
                inactive: false,
                deleted: false,
                productSnapshot: prepareProductSnapshot(fixedDbCartItem)
            });
            acc.orderItemList.push({
                productId,
                quantity: orderItem.quantity,
                priceSnapshot: dbProduct.price,
                appliedDiscountSnapshot: appliedDiscount
            });

            if (Object.keys(adjustments).length > 0) {
                acc.orderItemAdjustments.push(adjustedProductData);
            }
            
            return acc;
        },
        {
            fixedDbCart: [],
            fixedDbOrderItems: [],
            tradeProductList: [],
            cartItemList: [],
            orderItemList: [],
            orderItemAdjustments: [],
            orderItemsToRelease: []
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
