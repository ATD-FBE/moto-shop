import { HTTP_STATUS_CODE_MAP, REQUEST_STATUS } from '@shared/constants.js';
import type {
    TRequestStatus,
    TAuthErrorStatus,
    TValidationStatus,
    TGeneralErrorStatus,
    TSuccessStatus,
    TBaseResponse
} from '@shared/types/index.js';

// Сигналы для логов при ошибках подключения сервера
export type TShutdownSignal = 
    | 'SIGINT' 
    | 'SIGTERM' 
    | 'UNCAUGHT_EXCEPTION' 
    | 'UNHANDLED_REJECTION' 
    | 'SERVER_ERROR';

// Тип всех статус кодов
export type THttpStatusCode = typeof HTTP_STATUS_CODE_MAP[keyof typeof HTTP_STATUS_CODE_MAP][number];

// Карта типов статусов по кодам
export type TCodeToStatusMap<N extends number> =
    N extends typeof HTTP_STATUS_CODE_MAP.UNCHANGED[number]
        ? typeof REQUEST_STATUS.UNCHANGED
    : N extends typeof HTTP_STATUS_CODE_MAP.AUTH[number]
        ? TAuthErrorStatus
    : N extends typeof HTTP_STATUS_CODE_MAP.VALIDATION[number]
        ? TValidationStatus
    : N extends typeof HTTP_STATUS_CODE_MAP.GENERAL[number]
        ? TGeneralErrorStatus
    : N extends typeof HTTP_STATUS_CODE_MAP.MODIFIED[number]
        ? typeof REQUEST_STATUS.MODIFIED
    : N extends typeof HTTP_STATUS_CODE_MAP.SUCCESS[number]
        ? TSuccessStatus
    : TRequestStatus;

// Экстрактор нужного типа интерфейса по типу статус-кода с вырезанием статуса
export type TInferPayload<
    R extends TBaseResponse,
    N extends number,
    S extends TRequestStatus = TCodeToStatusMap<N> // Дженерик по умоланию берёт тип из карты кодов
> = Omit<Extract<R, { status: S }>, 'status'>;
