import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ICartTotals } from '@/types/index.js';
import type { IBaseCartItem, IGuestCartItem, ICartItem } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

export interface ICartState {
    byId: Record<string, ICartItem>;
    ids: string[];
    rawTotal: number;
    discountedTotal: number;
    isAccessible: boolean;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const defaultCartItemExtendedParams = {
    quantityReduced: false,
    outOfStock: false,
    inactive: false,
    deleted: false,
    productSnapshot: null
} as const;

const initialState: ICartState = {
    byId: {},
    ids: [],
    rawTotal: 0,
    discountedTotal: 0,
    isAccessible: true
};

const cartSlice = createSlice({
    name: 'cart',
    initialState,
    reducers: {
        setCartAccessibility: (state, action: PayloadAction<boolean>) => {
            state.isAccessible = action.payload;
        },

        setCart: (state, action: PayloadAction<(IGuestCartItem | ICartItem)[]>) => {
            const cartItemList = action.payload;

            state.byId = Object.fromEntries(cartItemList.map(item => [item.id, {
                ...defaultCartItemExtendedParams,
                ...item
            }]));
            state.ids = cartItemList.map(item => item.id);
        },

        upsertCartItem: (state, action: PayloadAction<IBaseCartItem>) => {
            const cartItem = action.payload;
            const { id, quantity } = cartItem;
            const isNew = !state.byId[id];

            if (isNew) {
                state.byId[id] = { ...defaultCartItemExtendedParams, ...cartItem };
                state.ids.push(id);
            } else if (state.byId[id]) {
                state.byId[id].quantity = quantity; // quantity > 0 при upsertCartItem
                state.byId[id].quantityReduced = false;
            }
        },

        removeCartItem: (state, action: PayloadAction<string>) => {
            const productId = action.payload;

            delete state.byId[productId];
            state.ids = state.ids.filter(id => id !== productId);
        },

        updateCartTotals: (state, action: PayloadAction<ICartTotals>) => {
            const { rawTotal, discountedTotal } = action.payload;

            state.rawTotal = rawTotal;
            state.discountedTotal = discountedTotal;
        },

        clearCart: (state) => {
            state.byId = {};
            state.ids = [];
            state.rawTotal = 0;
            state.discountedTotal = 0;
        }
    }
});

export const {
    setCartAccessibility,
    setCart,
    updateCartTotals,
    upsertCartItem,
    removeCartItem,
    clearCart
} = cartSlice.actions;

export default cartSlice.reducer;
