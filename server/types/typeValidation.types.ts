export type TCheckType =
    'string' | 'number' | 'boolean' | 'emptyableBoolean' | 'array' |
    'arrayOf' | 'object' | 'date' | 'objectId' | 'nullableObjectId';

export type TCheckFn = (val: unknown, ...args: any[]) => boolean;

export type ITypeCheckBase = Record<TCheckType, TCheckFn>;

export type ITypeCheck = Record<TCheckType, TCheckFn> & {
    optional: Record<TCheckType, TCheckFn>;
};

export interface IInputTypeMapConfig {
    value: unknown;
    type: TCheckType;
    elemType?: TCheckType;
    optional?: boolean;
    form?: boolean;
}

export type IInputTypeMap = Record<string, IInputTypeMapConfig>;

export interface IValidateInputTypesResult {
    invalidInputKeys: string[];
    fieldErrors: Record<string, string>;
}
