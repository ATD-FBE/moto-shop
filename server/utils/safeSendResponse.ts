import { resolveRequestStatus } from '@shared/statusResolver.js';
import type { Response } from 'express';
import type { TInferPayload } from '@server/types/index.js';
import type { TBaseResponse } from '@shared/types/index.js';

const NO_BODY_STATUSES = new Set([204, 205, 304]);

// Сигнатура 1: Для ответов БЕЗ тела
export default function safeSendResponse<T extends TBaseResponse>(
    res: Response<T>,
    statusCode: 204 | 205 | 304
): void;

// Сигнатура 2: Для ответов С телом
export default function safeSendResponse<T extends TBaseResponse, C extends number>(
    res: Response<T>,
    statusCode: C,
    data: TInferPayload<T, C>
): void;

// Главная реализация ответа
export default function safeSendResponse(
    res: Response,
    statusCode: number,
    data: Record<string, any> = {}
): void {
    if (res.writableEnded || res.destroyed || res.headersSent) return;

    if (NO_BODY_STATUSES.has(statusCode)) {
        res.status(statusCode).end();
        return;
    }

    const finalData = {
        ...data,
        status: data.status || resolveRequestStatus(statusCode, data.reason)
    };

    res.status(statusCode).json(finalData);
}
