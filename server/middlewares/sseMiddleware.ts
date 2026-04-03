import cors, { type CorsOptions } from 'cors';
import config from '@server/config/config.js';
import type { RequestHandler } from 'express';

export const sseCorsMiddleware: RequestHandler = (req, res, next) => {
    // Для продакшна (https) CORS не нужен
    if (config.env === 'production') {
        return next();
    }

    // Настройки для девелопмента (связь между портами клиента и сервера)
    const corsOptions: CorsOptions = {
        origin: `${config.protocol}://${config.host}:${config.clientPort}`,
        methods: ['GET'],
        allowedHeaders: ['Content-Type'],
        credentials: true
    };

    // Запуск стандартного cors мидлвар с этими опциями
    return cors(corsOptions)(req, res, next);
};
