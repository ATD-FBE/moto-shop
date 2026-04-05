import { resolveRequestStatus } from '@shared/statusResolver.js';
import type { Response } from 'express';
import type { TServerPayload } from '@server/types/index.js';

const NO_BODY_STATUSES = new Set([204, 205, 304]);

export default function safeSendResponse<T>(
    res: Response<T>,
    statusCode: number,
    data?: TServerPayload<T>
): void {
    if (res.writableEnded || res.destroyed || res.headersSent) return;

    if (NO_BODY_STATUSES.has(statusCode)) {
        res.status(statusCode).end();
        return;
    }

    const rawData = (data ?? {}) as any;

    const finalData = {
        ...rawData,
        status: rawData.status || resolveRequestStatus(statusCode, rawData.reason)
    } as T;

    res.status(statusCode).json(finalData);
}
