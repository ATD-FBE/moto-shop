import jwt from 'jsonwebtoken';
import { Request } from 'express';
import config from '@server/config/config.js';
import { toError } from '@shared/commonHelpers.js';
import { SEC_IN_MS } from '@shared/constants.js';
import type { ITokenUserPayload, TTokenType, ITokenTypeConfig } from '@server/types/index.js';

const TOKEN_CONFIG: Record<TTokenType, ITokenTypeConfig> = {
    'access': {
        key: config.jwt.accessSecretKey,
        time: '1h'
        //time: '10s'
    },
    'refresh': {
        key: config.jwt.refreshSecretKey,
        time: '7d'
        //time: '30s'
    }
};

export const generateToken = (user: ITokenUserPayload, type: TTokenType): string => {
    if (!(type in TOKEN_CONFIG)) {
        throw new Error('Неверный тип токена');
    }

    const { key: secretKey, time: expiresIn } = TOKEN_CONFIG[type];

    if (!secretKey) {
        throw new Error(`Отсутствует секретный ключ для ${type} токена`);
    }

    const payload = {
        _id: user._id.toString(),
        role: user.role
    };

    try {
        return jwt.sign(payload, secretKey, { expiresIn });
    } catch (err) {
        throw new Error(`Не удалось сгенерировать токен: ${toError(err).message}`);
    }
};

export const getTokenExpiryFromCookie = (req: Request, type: TTokenType): number => {
    const token = req.cookies[`${type}Token`];
    if (!token) return 0;

    const decoded = jwt.decode(token);
    
    if (decoded && typeof decoded !== 'string' && decoded.exp) {
        return decoded.exp * SEC_IN_MS; // exp в секундах, умножение на 1000 для мс
    }

    return 0;
};
