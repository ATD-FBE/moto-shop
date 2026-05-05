import type { TDiscountSource } from './shared.types.js';

export interface IBaseCartItem {
    id: string;
    quantity: number;
}

export interface IGuestCartItem extends IBaseCartItem {}

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
