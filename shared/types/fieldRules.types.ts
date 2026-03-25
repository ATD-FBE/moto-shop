import { validationRules } from '@shared/fieldRules.js';

/// Типизация сущностей ///
export type TValEntityType = keyof typeof validationRules;

/// validationRules ///
export type TValidationRulesEntity = Record<string, any>;

export type TValidationRulesGlobal = Record<TValEntityType, TValidationRulesEntity>;

/// fieldErrorMessages ///
export interface TFieldErrorMessagesField {
    readonly default: string;
    readonly [key: string]: string;
}

export type TFieldErrorMessagesEntity = Record<string, TFieldErrorMessagesField>;

export type TFieldErrorMessagesGlobal = Record<TValEntityType, TFieldErrorMessagesEntity> & {
    readonly DEFAULT: string;
};
