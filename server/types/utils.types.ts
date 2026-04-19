import { Types, type ClientSession, type FilterQuery, type PipelineStage } from 'mongoose';
import winston from 'winston';
import type { JwtPayload, SignOptions } from 'jsonwebtoken';
import type { TSearchTypes } from './config.types.js';
import type { TRegisteredUserRole } from '@shared/types/index.js';

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
    role: TRegisteredUserRole;
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
