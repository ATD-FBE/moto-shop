import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { IProductsState } from '@/types/index.js';
import type { IProduct } from '@shared/types/index.js';

const initialState: IProductsState = {
    byId: {},
    ids: []
};

const productsSlice = createSlice({
    name: 'products',
    initialState,
    reducers: {
        upsertProductsInStore: (state, action: PayloadAction<IProduct[]>) => {
            const products = action.payload;
        
            products.forEach(product => {
                const productId = product.id;
                const existingProduct = state.byId[productId];
        
                if (!existingProduct) state.ids.push(productId);
                state.byId[productId] = product;
            });
        },

        removeProductsFromStore: (state, action: PayloadAction<string[]>) => {
            const productIds = action.payload;
            const productIdsSet = new Set(productIds);

            productIds.forEach(id => delete state.byId[id]);
            state.ids = state.ids.filter(id => !productIdsSet.has(id));
        },

        removePrivilegedFieldsFromProducts: (state) => {
            const privilegedFields: (keyof IProduct)[] = ['stock', 'reserved', 'category', 'tags'];
            
            state.ids.forEach(id => {
                const product = state.byId[id];
                if (!product) return;
                
                privilegedFields.forEach(field => {
                    delete product[field];
                });
            });
        },

        clearProductStore: () => {
            return { ...initialState };
        }
    }
});

export const {
    upsertProductsInStore,
    removeProductsFromStore,
    removePrivilegedFieldsFromProducts,
    clearProductStore
} = productsSlice.actions;

export default productsSlice.reducer;
