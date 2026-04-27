import { Types } from 'mongoose';
import winston from 'winston';
import type { JwtPayload, SignOptions } from 'jsonwebtoken';
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

