import { updateCustomerDiscount } from '@/redux/slices/authSlice.js';
import {
    selectCartItemList,
    setCart,
    upsertCartItem,
    removeCartItem,
    updateCartTotals
} from '@/redux/slices/cartSlice.js';
import { upsertProductsInStore } from '@/redux/slices/productsSlice.js';
import { saveGuestCartToLocalStorage } from '@/services/guestCartService.js';
import type { TAppThunk, TRootState, ICartTotals } from '@/types/index.js';
import type { IBaseCartItem, IGuestCartItem, ICartItem, IProduct } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface ICartProductDataEntry {
    price: number;
    discount: number;
    quantity: number;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export const setCartItem = (
    cartItem: IBaseCartItem,
    isGuestCart: boolean = false
): TAppThunk<void> => (dispatch, getState) => {
    dispatch(upsertCartItem(cartItem));
    if (isGuestCart) saveGuestCart(getState);
};

export const unsetCartItem = (
    productId: string,
    isGuestCart: boolean = false
): TAppThunk<void> => (dispatch, getState) => {
    dispatch(removeCartItem(productId));
    if (isGuestCart) saveGuestCart(getState);
};

export const refreshCartTotals = (): TAppThunk<void> => (dispatch, getState) => {
    const state = getState();
    const cartItemList = selectCartItemList(state);
    const productMap = state.products.byId;
    const customerDiscount = state.auth.user?.discount ?? 0;

    const cartProductData = buildCartProductData(cartItemList, productMap);
    const cartTotals = calculateCartTotals(cartProductData, customerDiscount);

    dispatch(updateCartTotals(cartTotals));
};

export const buildCartProductData = (
    cartItemList: ICartItem[],
    productMap: Record<string, IProduct>
): ICartProductDataEntry[] =>
    cartItemList
        // У удалённых товаров нет доступа к цене для рассчёта сумм -> фильтр по удалённым
        .filter(cartItem => !cartItem.deleted)
        .map(cartItem => {
            const product = productMap[cartItem.id];

            return {
                price: product?.price ?? 0,
                discount: product?.discount ?? 0,
                quantity: cartItem.quantity
            };
        });

export const calculateCartTotals = (
    cartProductData: ICartProductDataEntry[],
    customerDiscount: number
): ICartTotals => {
    const { rawTotal, discountedTotal } = cartProductData.reduce((acc, cartItem) => {
        const { price, quantity, discount: productDiscount } = cartItem;
        acc.rawTotal += price * quantity;

        const effectiveDiscount = Math.max(productDiscount, customerDiscount);
        const discountFactor = 1 - effectiveDiscount / 100;
        acc.discountedTotal += price * quantity * discountFactor;

        return acc;
    }, { rawTotal: 0, discountedTotal: 0 });

    return {
        rawTotal: Number(rawTotal.toFixed(2)),
        discountedTotal: Number(discountedTotal.toFixed(2))
    };
};

export const applyCartState = (
    tradeProductList: IProduct[],
    cartItemList: (IGuestCartItem | ICartItem)[],
    customerDiscount: number = 0
): TAppThunk<void> => (dispatch) => {
    dispatch(upsertProductsInStore(tradeProductList)); // До обновления сумм!
    dispatch(setCart(cartItemList)); // До обновления сумм!
    dispatch(updateCustomerDiscount(customerDiscount)); // До обновления сумм!
    dispatch(refreshCartTotals());
};

export const reconcileCartWithProducts = (
    productList: IProduct[]
): TAppThunk<void> => (dispatch, getState) => {
    const state = getState();
    const cartItemList = selectCartItemList(state);
    const isGuest = !state.auth.isAuthenticated;
    const oldProductMap = state.products.byId;
    const newProductMap = new Map(productList.map(prod => [prod.id, prod]));
    let shouldUpdateCart = false;
    let shouldRefreshTotals = false;

    const updatedCartItemList = cartItemList.map(cartItem => {
        const newProduct = newProductMap.get(cartItem.id);
        if (!newProduct) return cartItem;

        // Проверка доступности количества и соответствия флагов товаров в корзине
        let updatedCartItem: ICartItem | null = null;

        if (isGuest) {
            if (!newProduct.isActive || newProduct.available === 0) {
                shouldUpdateCart = true;
                shouldRefreshTotals = true;
                return null;
            } else if (newProduct.available < cartItem.quantity) {
                updatedCartItem = { ...cartItem, quantity: newProduct.available };
                shouldRefreshTotals = true;
            }
        } else {
            if (newProduct.available < cartItem.quantity) {
                if (newProduct.available > 0 && !cartItem.quantityReduced) {
                    updatedCartItem = { ...cartItem, quantityReduced: true };
                } else if (newProduct.available === 0 && !cartItem.outOfStock) {
                    updatedCartItem = { ...cartItem, quantityReduced: true, outOfStock: true };
                }
            } else if (cartItem.quantityReduced || cartItem.outOfStock) {
                updatedCartItem = { ...cartItem, quantityReduced: false, outOfStock: false };
            }
    
            if (
                (newProduct.isActive && cartItem.inactive) ||
                (!newProduct.isActive && !cartItem.inactive)
            ) {
                updatedCartItem = { ...(updatedCartItem || cartItem), inactive: !newProduct.isActive };
            }
    
            if (cartItem.deleted) {
                updatedCartItem = { ...(updatedCartItem || cartItem), deleted: false };
            }
        }

        if (updatedCartItem) shouldUpdateCart = true;

        // Проверка изменения цены или скидки
        if (!shouldRefreshTotals) {
            const oldProduct = oldProductMap[cartItem.id];

            if (oldProduct && (
                newProduct.price !== oldProduct.price ||
                newProduct.discount !== oldProduct.discount
            )) {
                shouldRefreshTotals = true;
            }
        }
    
        return updatedCartItem || cartItem;
    }).filter((item): item is ICartItem => item !== null);

    dispatch(upsertProductsInStore(productList)); // До обновления сумм!
    if (shouldUpdateCart) {
        if (isGuest) saveGuestCartToLocalStorage(updatedCartItemList);
        dispatch(setCart(updatedCartItemList)); // До обновления сумм!
    }
    if (shouldRefreshTotals) dispatch(refreshCartTotals());
};

const saveGuestCart = (getState: () => TRootState): void => {
    const cartItemList = selectCartItemList(getState());
    saveGuestCartToLocalStorage(cartItemList);
};
