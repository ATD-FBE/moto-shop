import { Response } from 'express';
import type { IBaseResponse } from '@server/types/index.js';

const NO_BODY_STATUSES = new Set([204, 205, 304]);

export default function safeSendResponse<T extends Record<string, unknown>>(
    res: Response,
    statusCode: number,
    data: IBaseResponse & T = {} as IBaseResponse & T
): void {
    if (res.writableEnded || res.destroyed || res.headersSent) return;

    if (NO_BODY_STATUSES.has(statusCode)) {
        res.status(statusCode).end();
        return;
    }

    res.status(statusCode).json(data);
}
