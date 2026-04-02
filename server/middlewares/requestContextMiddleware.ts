import type { Request, Response, NextFunction } from 'express';

export const requestContext = (req: Request, res: Response, next: NextFunction): void => {
    const { method, originalUrl, ip = 'No IP' } = req;
    req.reqCtx = `${method} ${originalUrl} [${ip}]`;
    next();
};
