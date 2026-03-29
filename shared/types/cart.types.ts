import type { TDiscountSource } from './constants.types.js';

export interface IGuestCartItem {
    id: string;
    quantity: number;
}

export interface ICartItem {
    id: string;
    quantity: number;
    quantityReduced: boolean;
    outOfStock: boolean;
    inactive: boolean;
    deleted: boolean;
}

export interface ICartItemSnapshot {
    productId: string;
    priceSnapshot: number;
    appliedDiscountSnapshot: number;
    appliedDiscountSourceSnapshot: TDiscountSource;
}
