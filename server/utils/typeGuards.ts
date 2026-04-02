import type { Request, NextFunction } from 'express';
import type { TDbUser } from '@server/types/index.js';

export const requireDbUser = (req: Request, next: NextFunction): req is Request & { dbUser: TDbUser } => {
    if (!req.dbUser) {
        const error = new Error('Критическая ошибка: dbUser не инициализирован в защищенном маршруте');
        (error as any).statusCode = 500;
        next(error);
        return false;
    }
    return true;
};
