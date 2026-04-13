import { resolveRequestStatus } from '@shared/statusResolver.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { Response } from 'express';
import type {
    TBaseResponse,
    TRequestStatus,
    TAuthErrorStatus,
    TValidationStatuses,
    TGeneralErrorStatus,
    TSuccessStatus
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

// Карта типов статусов по кодам
type TCodeToStatusMap<C extends number> =
    C extends 204 | 205 | 304
        ? typeof REQUEST_STATUS.UNCHANGED
    : C extends 401 | 403 | 410
        ? TAuthErrorStatus
    : C extends 422
        ? TValidationStatuses
    : C extends 400 | 404 | 408 | 409 | 500
        ? TGeneralErrorStatus
    : C extends 412
        ? typeof REQUEST_STATUS.MODIFIED
    : C extends 200 | 201 | 207
        ? TSuccessStatus
    : TRequestStatus;

// Экстрактор нужного типа интерфейса по типу статус-кода с вырезанием статуса
type TInferPayload<
    T extends TBaseResponse,
    C extends number
> = Omit<
    Extract<T, { status: TCodeToStatusMap<C> }>, 
    'status'
>;

type TNoBodyStatus = typeof NO_BODY_STATUS_ARRAY[number];

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const NO_BODY_STATUS_ARRAY = [204, 205, 304] as const;
const NO_BODY_STATUSES = new Set(NO_BODY_STATUS_ARRAY);

// Сигнатура 1: Для ответов БЕЗ тела
export default function safeSendResponse<T extends TBaseResponse>(
    res: Response<T>,
    statusCode: TNoBodyStatus
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
