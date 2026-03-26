import mongoose from 'mongoose';
import { JwtPayload, SignOptions } from 'jsonwebtoken';
import type { TActiveUserRole } from '@shared/types/index.js';

export interface ITokenUserPayload {
    _id: string | mongoose.Types.ObjectId;
    role: TActiveUserRole;
}

export type TTokenDecodedUser = ITokenUserPayload & JwtPayload;

export type TTokenType = 'access' | 'refresh';

export interface ITokenTypeConfig {
    key: string;
    time: SignOptions['expiresIn'];
}
