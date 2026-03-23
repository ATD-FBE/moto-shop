import type { TDiscountSource } from './constants.types.js';

export interface IAppliedDiscount {
    appliedDiscount: number;
    appliedDiscountSource: TDiscountSource;
}

export interface IDotNotationPatch {
    path: string;
    value: any;
}
