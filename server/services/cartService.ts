import { Types } from 'mongoose';
import Product from '@server/db/models/Product.js';
import { prepareProduct, prepareProductSnapshot } from './productService.js';
import type { TDbProduct, TDbCartItem } from '@server/types/index.js';
import type { IGuestCartItem, ICartItem, IProduct } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

export interface IGuestCart {
    purchaseProductList: IProduct[];
    cartItemList: IGuestCartItem[];
}

export interface ICart {
    purchaseProductList: IProduct[];
    cartItemList: ICartItem[];
}

export interface IFixedDbCart {
    fixedDbCart: TDbCartItem[];
    purchaseProductList: IProduct[];
    cartItemList: ICartItem[];
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export const prepareGuestCart = async (cartItemList: IGuestCartItem[]): Promise<IGuestCart> => {
    const productIds = cartItemList.map(item => item.id);
    const dbProducts = productIds.length > 0
        ? await Product.find({ _id: { $in: productIds } }).lean<TDbProduct[]>()
        : [];

    // Сбор актуальной корзины
    const dbProductMap = new Map(dbProducts.map(prod => [prod._id.toString(), prod]));
    const now = Date.now();

    return cartItemList.reduce(
        (acc: IGuestCart, cartItem: IGuestCartItem): IGuestCart => {
            const productId = cartItem.id;
            const dbProduct = dbProductMap.get(productId);
            if (!dbProduct) return acc;

            acc.purchaseProductList.push(prepareProduct(dbProduct, { now }));
            if (!dbProduct.isActive) return acc;

            const available = Math.max(0, dbProduct.stock - dbProduct.reserved);
            if (available === 0) return acc;

            acc.cartItemList.push({
                id: productId,
                quantity: Math.min(cartItem.quantity, available)
            });
            return acc;
        },
        { purchaseProductList: [], cartItemList: [] }
    );
};

export const prepareCart = async (
    dbCartItemList: TDbCartItem[],
    { checkoutMode = false }: { checkoutMode?: boolean } = {}
): Promise<ICart> => {
    const productIds = dbCartItemList.map(item => item.productId);
    const dbProducts = productIds.length > 0
        ? await Product.find({ _id: { $in: productIds } }).lean<TDbProduct[]>()
        : [];

    // Сбор актуальной корзины
    const dbProductMap = new Map(dbProducts.map(prod => [prod._id.toString(), prod]));
    const now = Date.now();

    return dbCartItemList.reduce(
        (acc: ICart, dbCartItem: TDbCartItem): ICart => {
            const productId = dbCartItem.productId.toString();
            const dbProduct = dbProductMap.get(productId);

            if (!dbProduct) {
                acc.cartItemList.push({
                    id: productId,
                    quantity: dbCartItem.quantity,
                    quantityReduced: true,
                    outOfStock: true,
                    inactive: true,
                    deleted: true,
                    productSnapshot: prepareProductSnapshot(dbCartItem)
                });
                return acc;
            }

            const available = Math.max(0, dbProduct.stock - dbProduct.reserved);

            acc.purchaseProductList.push(prepareProduct(dbProduct, { now }));
            acc.cartItemList.push({
                id: productId,
                quantity: dbCartItem.quantity,
                quantityReduced: checkoutMode ? false : available < dbCartItem.quantity,
                outOfStock: checkoutMode ? false : available === 0,
                inactive: checkoutMode ? false : !dbProduct.isActive,
                deleted: false,
                productSnapshot: prepareProductSnapshot(dbCartItem)
            });
            return acc;
        },
        { purchaseProductList: [], cartItemList: [] }
    );
};

export const prepareDbGuestCart = async (guestCart: IGuestCartItem[]): Promise<TDbCartItem[]> => {
    const productIds = guestCart.map(item => item.id);
    const dbProducts = productIds.length > 0
        ? await Product.find({ _id: { $in: productIds } }).lean<TDbProduct[]>()
        : [];

    const dbProductMap = new Map(dbProducts.map(prod => [prod._id.toString(), prod]));

    return guestCart.map((cartItem: IGuestCartItem): TDbCartItem | null => {
        const dbProduct = dbProductMap.get(cartItem.id);
        if (!dbProduct) return null;

        if (!dbProduct.isActive) return null;

        const available = Math.max(0, dbProduct.stock - dbProduct.reserved);
        if (available <= 0) return null;

        return {
            productId: Types.ObjectId.createFromHexString(cartItem.id),
            quantity: cartItem.quantity,
            nameSnapshot: dbProduct.name,
            brandSnapshot: dbProduct.brand
        };
    }).filter((item): item is TDbCartItem => Boolean(item));
};

export const mergeCarts = (
    dbCart: TDbCartItem[],
    dbGuestCart: TDbCartItem[]
): TDbCartItem[] => {
    const mergedMap = new Map<string, TDbCartItem>();

    // Товары из серверной корзины в первую очередь
    for (const item of dbCart) {
        const key = item.productId.toString();
        mergedMap.set(key, item);
    }

    // Товары из гостевой корзины — перезапись серверных товаров в карте
    for (const item of dbGuestCart) {
        const key = item.productId.toString();
        mergedMap.set(key, item);
    }

    return Array.from(mergedMap.values());
};

export const areCartsDifferent = (aCart: TDbCartItem[], bCart: TDbCartItem[]): boolean => {
    if (aCart.length !== bCart.length) return true;

    const bCartMap = new Map<string, TDbCartItem>(
        bCart.map(item => [item.productId.toString(), item])
    );

    for (const aCartItem of aCart) {
        const productId = aCartItem.productId.toString();
        const bCartItem = bCartMap.get(productId);

        if (!bCartItem || aCartItem.quantity !== bCartItem.quantity) {
            return true;
        }
    }

    return false;
};

export const prepareFixedDbCart = async (dbCart: TDbCartItem[]): Promise<IFixedDbCart> => {
    const productIds = dbCart.map(item => item.productId);
    const dbProducts = productIds.length > 0
        ? await Product.find({ _id: { $in: productIds } }).lean<TDbProduct[]>()
        : [];

    // Сбор актуальной и исправленной корзины
    const dbProductMap = new Map(dbProducts.map(prod => [prod._id.toString(), prod]));
    const now = Date.now();

    return dbCart.reduce(
        (acc: IFixedDbCart, dbCartItem: TDbCartItem): IFixedDbCart => {
            const productId = dbCartItem.productId.toString();
            const dbProduct = dbProductMap.get(productId);
            if (!dbProduct) return acc;

            if (!dbProduct.isActive) return acc;

            const available = Math.max(0, dbProduct.stock - dbProduct.reserved);
            if (available === 0) return acc;

            const fixedDbCartItem: TDbCartItem = {
                productId: dbCartItem.productId,
                quantity: Math.min(dbCartItem.quantity, available),
                nameSnapshot: dbProduct.name,
                brandSnapshot: dbProduct.brand
            };

            acc.fixedDbCart.push(fixedDbCartItem);
            acc.purchaseProductList.push(prepareProduct(dbProduct, { now }));
            acc.cartItemList.push({
                id: productId,
                quantity: fixedDbCartItem.quantity,
                quantityReduced: false,
                outOfStock: false,
                inactive: false,
                deleted: false,
                productSnapshot: prepareProductSnapshot(dbCartItem)
            });
            return acc;
        },
        { fixedDbCart: [], purchaseProductList: [], cartItemList: [] }
    );
};

// id в гостевой корзине строка, в серверной корзине productId — ObjectId, приводимая к строке
