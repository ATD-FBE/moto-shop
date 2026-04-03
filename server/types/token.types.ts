import { Types } from 'mongoose';
import { JwtPayload, SignOptions } from 'jsonwebtoken';
import type { TActiveUserRole } from '@shared/types/index.js';

export type TTokenDecodedUser = JwtPayload & ITokenUserPayload;

export interface ITokenUserPayload {
    _id: string | Types.ObjectId;
    role: TActiveUserRole;
}

export type TTokenType = 'access' | 'refresh';

export interface ITokenTypeConfig {
    key: string;
    time: SignOptions['expiresIn'];
}
