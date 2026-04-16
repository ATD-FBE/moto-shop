import type { TEntityType, TEntityField } from '@shared/types/index.js';

export type TBaseCheckType =
    | 'string' | 'number' | 'integer' | 'boolean' | 'emptyableBoolean'
    | 'array' | 'object' | 'date' | 'objectId' | 'nullableObjectId';

export type TCheckType = TBaseCheckType | 'arrayOf';

export interface IValidationSchema {
    type: TCheckType;
    min?: number;
    max?: number;
    arrElemConfig?: IValidationSchema;
    fieldConfigs?: Record<string, IValidationSchema>;
    enumValues?: readonly any[];
    optional?: boolean;
    form?: boolean;
}

export interface IValidationConfig extends IValidationSchema {
    value: unknown;
    arrElemConfig?: IValidationConfig;
    fieldConfigs?: Record<string, IValidationConfig>;
}

export interface IValidationInputSchema<E extends TEntityType = TEntityType> {
    entityType?: E;
    params?: Record<string, TCheckType>;
    body?: Record<string, IValidationSchema>;
    query?: Record<string, IValidationSchema>;
}

export type TValidationConfigMap<E extends TEntityType = TEntityType> = {
    [K in TEntityField<E>]?: IValidationConfig;
} & {
    [key: string]: IValidationConfig;
};
