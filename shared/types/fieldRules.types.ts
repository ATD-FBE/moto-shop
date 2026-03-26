import { validationRules } from '@shared/fieldRules.js';

export type TEntityType =
    'auth' | 'customer' | 'news' | 'promotion' | 'notification' | 'category' |
    'product' | 'checkout' | 'order' | 'financials' | 'payment' | 'refund';

//export type TValidationRules = Record<TEntityType, Record<string, RegExp | Function>>;

export type TValidationRules = typeof validationRules;

export type TFieldErrorMessages = Record<TEntityType, Record<string, {
    readonly default: string;
    readonly [key: string]: string;
}>> & {
    readonly DEFAULT: string;
};
