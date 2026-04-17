import mongoose, { Types } from 'mongoose';
import { JwtPayload } from 'jsonwebtoken';
import { validationRules } from '@shared/fieldRules.js';
import { REGISTERED_USER_ROLES } from '@shared/constants.js';
import type { Request, NextFunction } from 'express';
import type { TDbUserDoc, TTokenDecodedUser } from '@server/types/index.js';
import type { TEntityType, TEntityField } from '@shared/types/index.js';

export const isTokenDecodedUser = (decoded: string | JwtPayload | null): decoded is TTokenDecodedUser => {
    if (typeof decoded !== 'object' || decoded === null) return false;

    const { _id, role } = decoded as Partial<TTokenDecodedUser>;

    const hasId = typeof _id === 'string' || _id instanceof Types.ObjectId;
    const hasRole = typeof role === 'string' && REGISTERED_USER_ROLES.includes(role);

    return hasId && hasRole;
};

export const requireDbUser = <R extends Request<any, any, any, any>>(
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
    fieldName: string
): fieldName is Extract<TEntityField<E>, string> => {
    return fieldName in validationRules[entityType];
};

export const isMongooseValidationError = (err: Error): err is mongoose.Error.ValidationError => {
    return err instanceof mongoose.Error.ValidationError || err.name === 'ValidationError';
};
