import { validationRules } from '@shared/fieldRules.js';

export type TValidationRules = typeof validationRules;
export type TEntityType = keyof TValidationRules;
export type TEntityField<E extends TEntityType> = keyof TValidationRules[E];

export type TFieldErrorMessages = {
    readonly [E in TEntityType]: {
        readonly [K in TEntityField<E>]: {
            readonly default: string;
            readonly [errorType: string]: string; // mismatch, unique и т.д.
        };
    };
};

export type TFieldErrors<E extends TEntityType = TEntityType> =
    Partial<Record<TEntityField<E>, string>>;
