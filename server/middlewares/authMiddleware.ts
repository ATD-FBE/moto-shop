import jwt from 'jsonwebtoken';
import User from '@server/db/models/User.js';
import config from '@server/config/config.js';
import { checkTimeout } from './timeoutMiddleware.js';
import { isTokenDecodedUser, requireDbUser } from '@server/utils/typeGuards.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import { toError } from '@shared/commonHelpers.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { RequestHandler } from 'express';
import type { TTokenDecodedUser  } from '@server/types/index.js';
import type { TRegisteredUserRole } from '@shared/types/index.js';

export const disableCache: RequestHandler = (_req, res, next) => {
    res.set('Cache-Control', 'no-store');
    next();
};

export const verifyAuth: RequestHandler = async (req, res, next) => {
    try {
        const accessToken: string | undefined = req.cookies.accessToken;

        if (!accessToken) {
            return safeSendResponse(res, 401, { message: 'Токен доступа отсутствует' });
        }
        
        const decodedUser = jwt.verify(accessToken, config.jwt.accessSecretKey);

        if (!isTokenDecodedUser(decodedUser)) {
            return safeSendResponse(res, 401, { message: 'Неверный формат или поврежденный токен' });
        }

        req.user = decodedUser as TTokenDecodedUser;
        next();
    } catch (err) {
        const error = toError(err);

        const jwtErrors: Record<string, string> = {
            TokenExpiredError: 'Срок действия токена доступа истёк',
            JsonWebTokenError: 'Неверный токен доступа',
            NotBeforeError: 'Токен доступа ещё не активен',
        };
    
        if (error.name in jwtErrors) {
            return safeSendResponse(res, 401, { message: jwtErrors[error.name] });
        }
        
        next(error);
    }
};

export const verifyUser: RequestHandler = async (req, res, next) => {
    try {
        if (!req.user) {
            throw new Error('Критическая ошибка: user не инициализирован в защищённом маршруте');
        }

        const userId = req.user._id;
        const dbUser = await User.findById(userId);
        checkTimeout(req);

        if (!dbUser) {
            return safeSendResponse(res, 410, {
                message: 'Пользователь не найден',
                reason: REQUEST_STATUS.USER_GONE
            });
        }

        req.dbUser = dbUser;
        next();
    } catch (err) {
        next(err);
    }
};

export const verifyRole = (...requiredRoles: TRegisteredUserRole[]): RequestHandler => (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    if (!requiredRoles.includes(req.dbUser.role)) {
        return safeSendResponse(res, 403, {
            message: 'Запрещено: недостаточно прав',
            reason: REQUEST_STATUS.DENIED
        });
    }

    next();
};

//////////////////////////////////////////////////////////////
/// Опциональные версии мидлвэаров проверки прав и доступа ///
//////////////////////////////////////////////////////////////

export const optionalAuth: RequestHandler = async (req, res, next) => {
    try {
        const accessToken: string | undefined = req.cookies.accessToken;

        if (accessToken) {
            const decodedUser = jwt.verify(accessToken, config.jwt.accessSecretKey);

            if (!isTokenDecodedUser(decodedUser)) {
                return safeSendResponse(res, 401, { message: 'Неверный формат или поврежденный токен' });
            }

            req.user = decodedUser as TTokenDecodedUser;
        }
        
        next();
    } catch (err) {
        const error = toError(err);

        const jwtErrors: Record<string, string> = {
            TokenExpiredError: 'Срок действия токена доступа истёк',
            JsonWebTokenError: 'Неверный токен доступа',
            NotBeforeError: 'Токен доступа ещё не активен',
        };
    
        if (error.name in jwtErrors) {
            return safeSendResponse(res, 401, { message: jwtErrors[error.name] });
        }

        next(error);
    }
};

export const optionalUser: RequestHandler = async (req, res, next) => {
    if (!req.user) {
        return next();
    }

    try {
        const userId = req.user._id;
        const dbUser = await User.findById(userId);
        checkTimeout(req);

        if (!dbUser) {
            return safeSendResponse(res, 410, {
                message: 'Пользователь не найден',
                reason: REQUEST_STATUS.USER_GONE
            });
        }

        req.dbUser = dbUser;
        next();
    } catch (err) {
        next(err);
    }
};
