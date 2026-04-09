import { REQUEST_STATUS } from '@shared/constants.js';
import type { TRequestStatus, TEntityType, TFieldErrors } from './shared.types.js';

// Объединения типов статусов для интерфейса ответа
export type TAuthErrorStatus =
    | typeof REQUEST_STATUS.UNAUTH
    | typeof REQUEST_STATUS.USER_GONE
    | typeof REQUEST_STATUS.DENIED
    | typeof REQUEST_STATUS.FORBIDDEN;

export type TValidationStatuses = 
    | typeof REQUEST_STATUS.INVALID 
    | typeof REQUEST_STATUS.LIMITATION;

export type TCommonErrorStatus =
    | typeof REQUEST_STATUS.BAD_REQUEST
    | typeof REQUEST_STATUS.NO_SELECTION
    | typeof REQUEST_STATUS.ERROR
    | typeof REQUEST_STATUS.TIMEOUT;

export type TSuccessStatus =
    | typeof REQUEST_STATUS.SUCCESS
    | typeof REQUEST_STATUS.PARTIAL;

// Интерфейсы ответа
export type TBaseResponse = {
    message: string;
    status: TRequestStatus;
    reason?: TRequestStatus;
};

export type TEmptyResponse = TBaseResponse & {
    status: typeof REQUEST_STATUS.UNCHANGED;
};

export type TAuthErrorResponse = TBaseResponse & {
    status: TAuthErrorStatus;
};

export type TValidationErrorResponse<E extends TEntityType> = TBaseResponse & {
    status: typeof REQUEST_STATUS.INVALID;
    fieldErrors: TFieldErrors<E>;
};

export type TLimitationErrorResponse<T extends Record<string, any> = {}> = TBaseResponse & {
    status: typeof REQUEST_STATUS.LIMITATION;
    reason: typeof REQUEST_STATUS.LIMITATION; // reason обязателен, чтобы отличить от INVALID
} & T;

export type TCommonErrorResponse = TBaseResponse & {
    status: TCommonErrorStatus;
};

export type TSuccessResponse<Data = {}> = TBaseResponse & Data & {
    status: TSuccessStatus;
};

export type TFileResponse = TBaseResponse & {
    status: typeof REQUEST_STATUS.SUCCESS;
    blob: Blob;
    filename: string;
};

export type TTextResponse = TBaseResponse & {
    text: string;
};
