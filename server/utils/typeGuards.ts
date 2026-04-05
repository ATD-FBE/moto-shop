import mongoose, { Types } from 'mongoose';
import { JwtPayload } from 'jsonwebtoken';
import { validationRules } from '@shared/fieldRules.js';
import { ACTIVE_USER_ROLES } from '@shared/constants.js';
import type { Request, NextFunction } from 'express';
import type { TDbUserDoc, TTokenDecodedUser } from '@server/types/index.js';
import type { TEntityType, TEntityField } from '@shared/types/index.js';

export const isTokenDecodedUser = (decoded: string | JwtPayload | null): decoded is TTokenDecodedUser => {
    if (typeof decoded !== 'object' || decoded === null) return false;

    const { _id, role } = decoded as Partial<TTokenDecodedUser>;

    const hasId = typeof _id === 'string' || _id instanceof Types.ObjectId;
    const hasRole = typeof role === 'string' && ACTIVE_USER_ROLES.includes(role);

    return hasId && hasRole;
};

export const requireDbUser = <R extends Request>(
    req: R,
    next: NextFunction
): req is R & { dbUser: TDbUserDoc } => {
    if (!req.dbUser) {
        next(new Error('Критическая ошибка: dbUser не инициализирован в защищённом маршруте'));
        return false;
    }
    return true;
};

export const isAppError = (err: Error): err is Error & { statusCode: number } => {
    return err.isAppError === true && typeof err.statusCode === 'number';
};

export const isValidEntityField = <E extends TEntityType>(
    entityType: E,
    field: string
): field is Extract<TEntityField<E>, string> => { // Extract выбирает только ключи с типом string
    return field in validationRules[entityType];
};

export const isMongooseValidationError = (err: Error): err is mongoose.Error.ValidationError => {
    return err instanceof mongoose.Error.ValidationError || err.name === 'ValidationError';
};

/*export type ProtectedRequestHandler<
    P = {}, 
    ResBody = any, 
    ReqBody = any, 
    ReqQuery = core.Query
> = RequestHandler<P, ResBody, ReqBody, ReqQuery> extends (req: infer Req, res: infer Res, next: infer Next) => infer Ret
    ? (req: Req & { dbUser: TDbUserDoc }, res: Res, next: Next) => Ret
    : never;*/
