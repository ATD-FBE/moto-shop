import type { TEntityType, TValidationRules, TFieldErrors } from '@shared/types/index.js';

export type TCheckType =
    'string' | 'number' | 'boolean' | 'emptyableBoolean' | 'array' |
    'arrayOf' | 'object' | 'date' | 'objectId' | 'nullableObjectId';

export type TCheckFn = (val: unknown, ...args: any[]) => boolean;

export type TBaseTypeChecks = Record<TCheckType, TCheckFn>;

export type TTypeCheck = TBaseTypeChecks & {
    optional: TBaseTypeChecks;
};

export interface IInputTypeMapConfig {
    value: unknown;
    type: TCheckType;
    elemType?: TCheckType;
    optional?: boolean;
    form?: boolean;
}

export type TInputTypeMap<E extends TEntityType = TEntityType> = {
    [K in keyof TValidationRules[E]]?: IInputTypeMapConfig;           // Для пришедших полей форм
} & {
    [key: string]: IInputTypeMapConfig;                               // Для других пришедших данных
};

export interface IValidateInputTypesResult<E extends TEntityType = TEntityType> {
    invalidInputKeys: string[];
    fieldErrors: TFieldErrors<E>;
}
