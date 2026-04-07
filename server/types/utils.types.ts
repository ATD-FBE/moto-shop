import { Types, type ClientSession, type FilterQuery, type PipelineStage } from 'mongoose';
import winston from 'winston';
import { allowedConfigTypes } from '@server/utils/multerConfig.js';
import type { JwtPayload, SignOptions } from 'jsonwebtoken';
import type { TMulterMode, TSearchTypes } from './config.types.js';
import type { 
    TEntityType, 
    TFieldErrors, 
    TAllowedMimeType, 
    TActiveUserRole,
    TValidationRules 
} from '@shared/types/index.js';

//////////////
/// LOGGER ///
//////////////

export interface IWinstonLogInfo extends winston.Logform.TransformableInfo {
    timestamp: string;
    message: string;
    stack?: string;
}

export interface IWinstonPreparedLogInfo {
    timestamp: string;
    level: string;
    message: string;
    stackData: string;
    metaData: string;
}

///////////////////
/// TOKEN UTILS ///
///////////////////

export interface ITokenUserPayload {
    _id: string | Types.ObjectId;
    role: TActiveUserRole;
}

export type TTokenDecodedUser = JwtPayload & ITokenUserPayload;

export type TTokenType = 'access' | 'refresh';

export interface ITokenTypeConfig {
    key: string;
    time: SignOptions['expiresIn'];
}

/////////////////////////
/// TRANSACTION UTILS ///
/////////////////////////

export type TTransactionHandler<T> = (session: ClientSession) => Promise<T>;

export type TTransactionOptions = Parameters<ClientSession['withTransaction']>[1];

///////////////////
/// ERROR UTILS ///
///////////////////

export interface IAppErrorData {
    message: string;
    [key: string]: unknown;
}

export interface IParseValidationErrorsResult<E extends TEntityType = TEntityType> {
    systemFieldError: Error | null;
    fieldErrors: TFieldErrors<E> | null;
}

///////////////////////
/// TYPE VALIDATION ///
///////////////////////

export type TCheckType =
    | 'string' | 'number' | 'boolean' | 'emptyableBoolean' | 'array'
    | 'arrayOf' | 'object' | 'date' | 'objectId' | 'nullableObjectId';

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
    [K in keyof TValidationRules[E]]?: IInputTypeMapConfig;
} & {
    [key: string]: IInputTypeMapConfig;
};

export interface IValidateInputTypesResult<E extends TEntityType = TEntityType> {
    invalidInputKeys: string[];
    fieldErrors: TFieldErrors<E>;
}

/////////////////////
/// MULTER CONFIG ///
/////////////////////

export interface IMulterErrorContext {
    field: string;
    filesLimit: number;
    maxSizeMB: number;
    message: string;
}

export interface IMulterErrorSpec {
    type: string;
    message: string;
}

export interface IMulterField {
    name: string;
    maxCount?: number;
}

export interface IMulterConfigArgs {
    type: typeof allowedConfigTypes[number];
    fields: 
        | string
        | IMulterField
        | IMulterField[];
    storageMode?: TMulterMode;
    storagePath?: string | null;
    allowedMimeTypes: readonly TAllowedMimeType[];
    filesLimit?: number;
    maxSizeMB: number;
}

/////////////////////////
/// AGGREGATION UTILS ///
/////////////////////////

export interface IOrderedFiltersArgs {
    computedFields: PipelineStage[];
    searchMatch: FilterQuery<any>;
    filterMatch: FilterQuery<any>;
    extraFilters: PipelineStage[];
    searchType: TSearchTypes;
}

///////////////////////////
/// SAFE RESPONSE UTILS ///
///////////////////////////

export type TServerPayload<T> = T extends any ? Omit<T, 'status'> : never;
