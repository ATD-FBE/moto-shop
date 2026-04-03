import type { RequestHandler } from 'express';

export const requestContext: RequestHandler = (req, _res, next) => {
    const { method, originalUrl, ip = 'No IP' } = req;
    req.reqCtx = `${method} ${originalUrl} [${ip}]`;
    next();
};
