import { HTTP_STATUS_CODE_MAP } from '@shared/constants.js';
import { resolveRequestStatus } from '@shared/statusResolver.js';
import type { Response } from 'express';
import type { TInferPayload, TCodeToStatusMap } from '@server/types/index.js';
import type { TBaseResponse, TRequestStatus } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TNoBodyStatus = typeof HTTP_STATUS_CODE_MAP.UNCHANGED[number];

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const NO_BODY_STATUSES = new Set(HTTP_STATUS_CODE_MAP.UNCHANGED);

// Перегрузка: Сигнатура 1 - Для ответов БЕЗ тела
export default function safeSendResponse<R extends TBaseResponse>(
    res: Response<R>,
    statusCode: TNoBodyStatus
): void;

// Перегрузка: Сигнатура 2 - Для ответов С телом
export default function safeSendResponse<
    R extends TBaseResponse,
    N extends number,
    S extends TRequestStatus = TCodeToStatusMap<N>
>(
    res: Response<R>,
    statusCode: N,
    data: TInferPayload<R, N, S>
): void;

// Главная реализация ответа
export default function safeSendResponse(
    res: Response,
    statusCode: number,
    data: Record<string, any> = {}
): void {
    if (res.writableEnded || res.destroyed) return;

    // Заголовки уже ушли (может быть отдача бинарных данных) => закрытие потока и выход
    if (res.headersSent) {
        res.end(); 
        return;
    }

    if (NO_BODY_STATUSES.has(statusCode as TNoBodyStatus)) {
        res.status(statusCode).end();
        return;
    }

    const finalData = {
        ...data,
        status: data.status || resolveRequestStatus(statusCode, data.reason)
    };

    res.status(statusCode).json(finalData);
}
