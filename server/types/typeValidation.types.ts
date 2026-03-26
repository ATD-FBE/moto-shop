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

export type IInputTypeMap = Record<string, IInputTypeMapConfig>;

export interface IValidateInputTypesResult {
    invalidInputKeys: string[];
    fieldErrors: Record<string, string>;
}
