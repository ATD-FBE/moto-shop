import Product from '@server/db/models/Product.js';
import User from '@server/db/models/User.js';
import { checkTimeout } from '@server/middlewares/timeoutMiddleware.js';
import { prepareGuestCart, prepareCart, prepareFixedDbCart } from '@server/services/cartService.js';
import { requireDbUser } from '@server/utils/typeGuards.js';
import { runInDbTransaction } from '@server/utils/dbUtils.js';
import { createAppError } from '@server/utils/errorUtils.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { TDbProduct } from '@server/types/index.js';
import type {
    IGuestCartItemListBody,
    TGuestCartItemListResponse,
    TCartItemListResponse,
    ICartItemUpdateBody,
    TCartItemUpdateResponse,
    ICartItemRestoreBody,
    TCartItemRestoreResponse,
    TCartWarningsFixResponse,
    TCartItemRemoveResponse,
    TCartClearResponse
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface ICartParams extends ParamsDictionary {
    productId: string;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

/// Синхронизация гостевой корзины ///
export const handleGuestCartItemListRequest: RequestHandler<
    {},
    TGuestCartItemListResponse,
    IGuestCartItemListBody
> = async (req, res, next) => {
    const { guestCart } = req.body;

    try {
        const { tradeProductList, cartItemList } = await prepareGuestCart(guestCart);
        checkTimeout(req);

        safeSendResponse(res, 200, {
            message: 'Гостевая корзина успешно синхронизирована',
            tradeProductList,
            cartItemList
        });
    } catch (err) {
        next(err);
    }
};

/// Загрузка серверной корзины ///
export const handleCartItemListRequest: RequestHandler<
    {},
    TCartItemListResponse
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const dbUser = req.dbUser;

    try {
        const { tradeProductList, cartItemList } = await prepareCart(dbUser.cart);
        checkTimeout(req);

        safeSendResponse(res, 200, {
            message: 'Корзина успешно загружена',
            tradeProductList,
            cartItemList,
            customerDiscount: dbUser.discount
        });
    } catch (err) {
        next(err);
    }
};

/// Добавление/изменение количества/удаление товара в корзине ///
export const handleCartItemUpdateRequest: RequestHandler<
    ICartParams,
    TCartItemUpdateResponse,
    ICartItemUpdateBody
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const userId = req.dbUser._id.toString();
    const productId = req.params.productId;
    const { quantity } = req.body;

    try {
        const { prodLbl, actionMsg } = await runInDbTransaction(async (session) => {
            const txDbUser = await User.findById(userId).session(session);
    
            if (!txDbUser) {
                throw createAppError(404, `Пользователь (ID: ${userId}) не найден`);
            }

            const existingCartItem = txDbUser.cart.find(item => item.productId.equals(productId));

            let prodLbl = existingCartItem ? `"${existingCartItem.nameSnapshot}"` : `(ID: ${productId})`;
            let actionMsg: string = '';

            if (quantity === 0) {
                txDbUser.cart.pull({ productId });
                actionMsg = 'удален из корзины';
            } else {
                const dbProduct = await Product.findById(productId).lean<TDbProduct>().session(session);
                checkTimeout(req);
    
                if (!dbProduct) {
                    throw createAppError(404, `Товар ${prodLbl} не найден`);
                }

                const nameSnapshot = dbProduct.name;
                const brandSnapshot = dbProduct.brand ?? null;
                prodLbl = `"${nameSnapshot}"`;
    
                // Актуальное количество товара на складе в этом обработчике не проверяется
                if (existingCartItem) {
                    Object.assign(existingCartItem, { quantity, nameSnapshot, brandSnapshot });
                    actionMsg = `обновлён в корзине в количестве ${quantity} ед.`;
                } else {
                    txDbUser.cart.push({ productId, quantity, nameSnapshot, brandSnapshot });
                    actionMsg = `добавлен в корзину в количестве ${quantity} ед.`;
                }
            }
    
            await txDbUser.save({ session });
            checkTimeout(req);

            req.dbUser = txDbUser;
            return { prodLbl, actionMsg };
        });

        safeSendResponse(res, 200, { message: `Товар ${prodLbl} успешно ${actionMsg}` });
    } catch (err) {
        next(err);
    }
};

/// Восстановление товара в корзине ///
export const handleCartItemRestoreRequest: RequestHandler<
    ICartParams,
    TCartItemRestoreResponse,
    ICartItemRestoreBody
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const userId = req.dbUser._id.toString();
    const productId = req.params.productId;
    const { quantity, position } = req.body;

    try {
        const { prodLbl } = await runInDbTransaction(async (session) => {
            const txDbUser = await User.findById(userId).session(session);
    
            if (!txDbUser) {
                throw createAppError(404, `Пользователь (ID: ${userId}) не найден`);
            }
    
            const isItemInCart = txDbUser.cart.some(item => item.productId.equals(productId));
        
            if (isItemInCart) {
                throw createAppError(400, 'Товар уже существует в корзине');
            }

            const dbProduct = await Product.findById(productId).lean<TDbProduct>().session(session);
            checkTimeout(req);

            const prodLbl = dbProduct ? `"${dbProduct.name}"` : `(ID: ${productId})`;

            if (!dbProduct) {
                throw createAppError(404, `Товар ${prodLbl} не найден`);
            }
    
            const insertPos = position <= txDbUser.cart.length ? position : txDbUser.cart.length;
            const newItem = {
                productId,
                quantity,
                nameSnapshot: dbProduct.name,
                brandSnapshot: dbProduct.brand ?? null
            };
    
            txDbUser.cart.splice(insertPos, 0, newItem);
            await txDbUser.save({ session });
            checkTimeout(req);

            req.dbUser = txDbUser;
            return { prodLbl };
        });

        safeSendResponse(res, 200, { message: `Товар ${prodLbl} успешно восстановлен в корзине` });
    } catch (err) {
        next(err);
    }
};

/// Исправление всех проблемных товаров в корзине ///
export const handleCartWarningsFixRequest: RequestHandler<
    ICartParams,
    TCartWarningsFixResponse
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const userId = req.dbUser._id.toString();

    try {
        const transactionResult = await runInDbTransaction(async (session) => {
            const txDbUser = await User.findById(userId).session(session);
    
            if (!txDbUser) {
                throw createAppError(404, `Пользователь (ID: ${userId}) не найден`);
            }

            const {
                fixedDbCart,
                tradeProductList,
                cartItemList
            } = await prepareFixedDbCart(txDbUser.cart, session);
            checkTimeout(req);

            txDbUser.cart.splice(0, txDbUser.cart.length, ...fixedDbCart);
            await txDbUser.save({ session });
            checkTimeout(req);

            req.dbUser = txDbUser;
            return {
                tradeProductList,
                cartItemList,
                customerDiscount: txDbUser.discount
            };
        });

        const { tradeProductList, cartItemList, customerDiscount } = transactionResult;

        safeSendResponse(res, 200, {
            message: 'Проблемные товары в корзине успешно исправлены',
            tradeProductList,
            cartItemList,
            customerDiscount
        });
    } catch (err) {
        next(err);
    }
};

/// Удаление товара из корзины ///
export const handleCartItemRemoveRequest: RequestHandler<
    ICartParams,
    TCartItemRemoveResponse
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const dbUser = req.dbUser;
    const productId = req.params.productId;

    try {
        const existingCartItem = dbUser.cart.find(item => item.productId.equals(productId));
        const prodLbl = existingCartItem ? `"${existingCartItem.nameSnapshot}"` : `(ID: ${productId})`;

        const updatedUser = await User.findByIdAndUpdate(
            dbUser._id,
            { $pull: { cart: { productId } } },
            { new: true }
        );

        if (updatedUser) req.dbUser = updatedUser;

        safeSendResponse(res, 200, { message: `Товар ${prodLbl} удалён из корзины` });
    } catch (err) {
        next(err);
    }
};

/// Очистка корзины ///
export const handleCartClearRequest: RequestHandler<
    {},
    TCartClearResponse
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    try {
        const updatedUser = await User.findByIdAndUpdate(
            req.dbUser._id,
            { $set: { cart: [] } },
            { new: true }
        );
        
        if (updatedUser) req.dbUser = updatedUser;

        safeSendResponse(res, 200, { message: 'Корзина успешно очищена' });
    } catch (err) {
        next(err);
    }
};
