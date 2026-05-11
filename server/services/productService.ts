import { Types, type ClientSession, type FilterQuery, type PipelineStage } from 'mongoose';
import Order from '@server/db/models/Order.js';
import User from '@server/db/models/User.js';
import Product from '@server/db/models/Product.js';
import Category from '@server/db/models/Category.js';
import {
    PRODUCT_STORAGE_FOLDER,
    PRODUCT_ORIGINALS_FOLDER,
    PRODUCT_THUMBNAILS_FOLDER,
    STORAGE_URL_PATH
} from '@server/config/paths.js';
import { storageService } from './storage/storageService.js';
import { calculateOrderTotals } from './orderService.js';
import { ORDER_MODEL_TYPE, ORDER_ADJUSTMENT_TYPE } from '@server/config/constants.js';
import {
    PRODUCT_BRAND_NEW_THRESHOLD_MS,
    PRODUCT_RESTOCK_THRESHOLD_MS,
    PRODUCT_THUMBNAIL_PRESETS,
    ORDER_STATUS
} from '@shared/constants.js';
import type {
    TDbProduct,
    IDbProductComputedFields,
    TDbProductView,
    TDbCartItem,
    TDbOrderDraft,
    TDbUser,
    TOrderAdjustmentTypes,
    IOrderItemRef
} from '@server/types/index.js';
import type {
    IProduct,
    IProductImage,
    TProductImageThumbs,
    TProductThumbnailKey,
    TProductThumbnailSize,
    TProductSnapshot,
    TQuery
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IProductFilterQuery<TModel extends object> extends TQuery<TModel> {
    inStock?: boolean | '';
    brandNew?: boolean | '';
    restocked?: boolean | '';
    reserved?: boolean | '';
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export const prepareProduct = (
    dbProduct: TDbProduct & Partial<IDbProductComputedFields>,
    { managed = false, now = Date.now() }: { managed?: boolean; now?: number } = {}
): IProduct => {
    const productId = dbProduct._id.toString();
    const available = Math.max(0, dbProduct.stock - dbProduct.reserved);

    return {
        _type: 'full',
        id: productId,
        images: prepareProductImages(productId, dbProduct.imageFilenames),
        mainImageIndex: dbProduct.mainImageIndex ?? undefined,
        sku: dbProduct.sku ?? undefined,
        name: dbProduct.name,
        brand: dbProduct.brand ?? undefined,
        description: dbProduct.description ?? undefined,
        available,
        isBrandNew: dbProduct.isBrandNew ??
            (dbProduct.createdAt.getTime() >= (now - PRODUCT_BRAND_NEW_THRESHOLD_MS) && available > 0),
        isRestocked: dbProduct.isRestocked ??
            (dbProduct.lastRestockAt.getTime() >= (now - PRODUCT_RESTOCK_THRESHOLD_MS) && available > 0),
        unit: dbProduct.unit,
        price: dbProduct.price,
        discount: dbProduct.discount,
        isActive: dbProduct.isActive,
        ...(managed && {
            stock: dbProduct.stock,
            reserved: dbProduct.reserved,
            category: dbProduct.category.toString(),
            tags: dbProduct.tags.join(', ')
        })
    };
};

const prepareProductImages = (productId: string, imageFilenames: string[]): IProductImage[] => {
    return imageFilenames.map(filename => ({
        filename,
        original: [
            STORAGE_URL_PATH,
            PRODUCT_STORAGE_FOLDER,
            productId,
            PRODUCT_ORIGINALS_FOLDER,
            filename
        ].join('/'),
        thumbnails: Object.fromEntries(
            (Object.entries(PRODUCT_THUMBNAIL_PRESETS) as [TProductThumbnailKey, TProductThumbnailSize][])
                .map(([key, size]) => [
                    key, 
                    [
                        STORAGE_URL_PATH,
                        PRODUCT_STORAGE_FOLDER,
                        productId,
                        PRODUCT_THUMBNAILS_FOLDER,
                        `${size}px`,
                        filename
                    ].join('/')
                ])
        ) as TProductImageThumbs
    }));
};

export const prepareProductSnapshot = (dbCartItem: TDbCartItem): TProductSnapshot => ({
    _type: 'snapshot',
    name: dbCartItem.nameSnapshot,
    brand: dbCartItem.brandSnapshot ?? undefined
});

export const cleanupBulkProductFiles = (ids: string[], reqCtx: string): void => {
    ids.forEach(id => {
        storageService.cleanupProductFiles(id, reqCtx);
    });
};

// Пропорциональное уменьшение кол-ва товара для оформляющих заказ клиентов при его уменьшении админом
export const redistributeProductProportionallyInOrderDrafts = async (
    productId: string,
    newStock: number,
    session: ClientSession
): Promise<void> => {
    const productObjectId = Types.ObjectId.createFromHexString(productId);

    // Получение всех черновиков заказов с данным товаром
    const orderDrafts: TDbOrderDraft[] = await Order
        .find({
            currentStatus: ORDER_STATUS.DRAFT,
            items: { $elemMatch: { productId: productObjectId } }
        })
        .sort({ createdAt: 1 }) // При равных пропорциях единиц остатков приоритет у первого создавшего заказ
        .lean<TDbOrderDraft[]>()
        .session(session);

    // Сбор всех запросов по количеству для этого товара
    const requests = orderDrafts.flatMap(order => {
        const orderItem = order.items.find(item => item.productId.toString() === productId);
        if (!orderItem) return []; // Элемент пустого массива "исчезнет" при flatMap
    
        return [{
            orderId: order._id,
            customerId: order.customerId,
            quantity: orderItem.quantity,
            items: order.items.map(item => ({ ...item }))
        }];
    });

    // Проверка общего количества заказов товара
    const totalRequested = requests.reduce((sum, req) => sum + req.quantity, 0);
    if (totalRequested <= newStock) return; // Выход, если суммарно заказов меньше или равно запасу

    // Пропорциональное распределение с учётом округления вниз
    const proportion = newStock / totalRequested;

    const tempResults = requests.map(req => {
        const raw = req.quantity * proportion;
        const allocated = Math.floor(raw);
        const fraction = raw - allocated;
        return { ...req, allocated, fraction };
    });

    if (!tempResults.length) return; // На всякий случай

    // Вычисление остатка после распределения с округлением
    const allocatedSum = tempResults.reduce((sum, req) => sum + req.allocated, 0);
    let remaining = newStock - allocatedSum;

    // Распределение оставшихся единиц по убыванию дробной части
    // При одинаковых дробных частях порядок запросов сохраняется (по дате создания заказа)
    tempResults.sort((a, b) => b.fraction - a.fraction);

    for (let i = 0; i < tempResults.length && remaining > 0; i++, remaining--) {
        const req = tempResults[i];
        if (req) req.allocated++;
    }

    // Удаление из результатов тех запросов, в которых количество после распределения не измелось
    const filteredTempResults = tempResults.filter(req => req.allocated !== req.quantity);

    // Обновление количества товара в массиве для пересчёта сумм
    filteredTempResults.forEach(req => {
        req.items = req.items.map(item => {
            if (item.productId.toString() === productId) {
                return { ...item, quantity: req.allocated };
            }
            return item;
        });
    });

    // Сохранение изменений в заказах через формирование bulk-операций
    const orderBulkOps = filteredTempResults.map(req => ({
        updateOne: {
            filter: { _id: req.orderId, _modelType: ORDER_MODEL_TYPE.DRAFT },
            update: { 
                $set: {
                    'items.$[item].quantity': req.allocated,
                    totals: calculateOrderTotals(req.items)
                }
            },
            arrayFilters: [{ 'item.productId': productObjectId }] // item - название элемента массива
        }
    }));

    if (orderBulkOps.length > 0) {
        await Order.bulkWrite(orderBulkOps, { session });
    }

    // Сохранение изменений в корзинах клиентов через формирование bulk-операций
    const customerIds = filteredTempResults.map(req => req.customerId);
    const users = await User.find({
        _id: { $in: customerIds },
        cart: { $elemMatch: { productId: productObjectId } }
    }).lean<TDbUser[]>().session(session);

    const requestMap: Record<string, (typeof filteredTempResults)[number]> = 
        Object.fromEntries(filteredTempResults.map(req => [req.customerId.toString(), req]));

    const userBulkOps = users.flatMap(user => {
        const cartItem = user.cart.find(item => item.productId.toString() === productId);
        if (!cartItem) return [];

        const request = requestMap[user._id.toString()];
        if (!request) return [];

        // Сохранение только если количество товара в корзине больше нового распределённого количества
        // Клиент мог отнять количество товара в корзине после создания черновика заказа
        const newQuantity = Math.min(cartItem.quantity, request.allocated);
        if (newQuantity === cartItem.quantity) return [];

        return [{
            updateOne: {
                filter: { _id: user._id },
                update: { $set: { 'cart.$[item].quantity': newQuantity } },
                arrayFilters: [{ 'item.productId': productObjectId }] // item - название элемента массива
            }
        }];
    });

    if (userBulkOps.length > 0) {
        await User.bulkWrite(userBulkOps, { session });
    }
};

export const applyProductBulkUpdate = async (
    orderItemList: IOrderItemRef[],
    adjustmentType: TOrderAdjustmentTypes,
    session: ClientSession
): Promise<void> => {
    const bulkOps = orderItemList.map(item => ({
        updateOne: {
            filter: { _id: item.productId },
            update: buildProductInventoryUpdatePipeline(adjustmentType, item.quantity)
        }
    }));
  
    if (bulkOps.length) {
        await Product.bulkWrite(bulkOps, { session });
    }
};

// Построение агрегатного pipeline для операций с обновлёнными значениями полей на каждом шаге
export const buildProductInventoryUpdatePipeline = (
    adjustmentType: TOrderAdjustmentTypes,
    quantity: number
): PipelineStage[] => {
    switch (adjustmentType) {
        case ORDER_ADJUSTMENT_TYPE.RESERVE:
            return [
                { $set: { reserved: { $add: ['$reserved', quantity] } } },                    // rsv + qty
            ];

        case ORDER_ADJUSTMENT_TYPE.RELEASE:
            return [
                { $set: { reserved: { $max: [{ $subtract: ['$reserved', quantity] }, 0] } } } // rsv - qty
            ];

        case ORDER_ADJUSTMENT_TYPE.COMMIT:
            return [
                {
                    $set: {
                        stock: { $max: [{ $subtract: ['$stock', quantity] }, 0] },            // stk - qty
                        reserved: { $max: [{ $subtract: ['$reserved', quantity] }, 0] }       // rsv - qty
                    }
                }
            ];

        case ORDER_ADJUSTMENT_TYPE.ADJUST:
            return [
                { $set: { stock: { $max: [{ $subtract: ['$stock', quantity] }, 0] } } }       // stk - ±qty
            ];

        case ORDER_ADJUSTMENT_TYPE.RETURN:
            return [
                { $set: { stock: { $add: ['$stock', quantity] } } }                           // stk + qty
            ];
        
        default:
            throw new Error(`Неизвестный тип апдейта товара: ${adjustmentType}`);
    }
};

// Создание вычисляемых полей-флагов для фильтрации
export const buildProductsComputedFields = (
    query: IProductFilterQuery<TDbProductView>
): PipelineStage[] => {
    const needInStockFilter = query.inStock !== undefined && query.inStock !== '';
    const needBrandNewFilter = query.brandNew !== undefined && query.brandNew !== '';
    const needRestockedFilter = query.restocked !== undefined && query.restocked !== '';
    const needReservedFilter = query.reserved !== undefined && query.reserved !== '';

    if (!needInStockFilter && !needBrandNewFilter && !needRestockedFilter && !needReservedFilter) return [];

    const fields: FilterQuery<TDbProductView> = {};
    const now = Date.now();

    const availableStockExpr = { $subtract: ['$stock', '$reserved'] };

    if (needInStockFilter) {
        fields.inStock = { $cond: [{ $gt: [availableStockExpr, 0] }, true, false] };
    }
    
    if (needBrandNewFilter) {
        fields.isBrandNew = {
            $cond: [
                {
                    $and: [
                        { $gte: ['$createdAt', new Date(now - PRODUCT_BRAND_NEW_THRESHOLD_MS)] },
                        { $gt: [availableStockExpr, 0] }
                    ]
                },
                true,
                false
            ]
        };
    }
    
    if (needRestockedFilter) {
        fields.isRestocked = {
            $cond: [
                {
                    $and: [
                        { $gte: ['$lastRestockAt', new Date(now - PRODUCT_RESTOCK_THRESHOLD_MS)] },
                        { $gt: [availableStockExpr, 0] }
                    ]
                },
                true,
                false
            ]
        };
    }

    if (needReservedFilter) {
        fields.isReserved = { $cond: [{ $gt: ['$reserved', 0] }, true, false] };
    }

    return [{ $addFields: fields }];
};

// Пайплайн для категорий товаров
export const buildCategoriesPipeline = async (categoryParam?: unknown): Promise<PipelineStage[]> => {
    const category = typeof categoryParam === 'string' ? categoryParam.trim() : '';
    const categoryId = category.split('~').pop() || '';
    
    if (!categoryId || !Types.ObjectId.isValid(categoryId)) {
        return [];
    }

    const categoryObjectId = new Types.ObjectId(categoryId);

    const categoryData = await Category.aggregate<{ allIds: Types.ObjectId[] }>([
        { $match: { _id: categoryObjectId } },
        {
            $graphLookup: {
                from: 'categories',
                startWith: '$_id',
                connectFromField: '_id',
                connectToField: 'parent',
                as: 'descendants'
            }
        },
        {
            $project: {
                allIds: { $concatArrays: [['$_id'], '$descendants._id'] }
            }
        }
    ]);

    const allCategoryIds = categoryData[0]?.allIds || [categoryObjectId];

    return [
        {
            $match: {
                category: { $in: allCategoryIds }
            }
        }
    ];
};
