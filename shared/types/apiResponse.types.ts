import { REQUEST_STATUS } from '@shared/constants.js';
import type { TRequestStatus, TEntityType, TFieldErrors } from './shared.types.js';

/// Группировка типов статусов в интерфейсах ответа ///
export type TAuthErrorStatus =
    | typeof REQUEST_STATUS.UNAUTH
    | typeof REQUEST_STATUS.USER_GONE
    | typeof REQUEST_STATUS.DENIED
    | typeof REQUEST_STATUS.FORBIDDEN;

export type TGeneralErrorStatus =
    | typeof REQUEST_STATUS.BAD_REQUEST
    | typeof REQUEST_STATUS.NOT_FOUND
    | typeof REQUEST_STATUS.NO_SELECTION
    | typeof REQUEST_STATUS.CONFLICT
    | typeof REQUEST_STATUS.ERROR
    | typeof REQUEST_STATUS.TIMEOUT
    | typeof REQUEST_STATUS.ABORTED;

export type TValidationStatuses = 
    | typeof REQUEST_STATUS.INVALID 
    | typeof REQUEST_STATUS.LIMITATION;

export type TSuccessStatus =
    | typeof REQUEST_STATUS.SUCCESS
    | typeof REQUEST_STATUS.PARTIAL;

/// Интерфейсы ответа ///
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

export type TGeneralErrorResponse = TBaseResponse & {
    status: TGeneralErrorStatus;
};

export type TFormFieldsErrorResponse<E extends TEntityType> = TBaseResponse & {
    status: typeof REQUEST_STATUS.INVALID;
    fieldErrors: TFieldErrors<E>;
};

export type TLimitationErrorResponse<T = Record<string, never>> = TBaseResponse & {
    status: typeof REQUEST_STATUS.LIMITATION;
    reason: typeof REQUEST_STATUS.LIMITATION; // reason обязателен, чтобы отличить от INVALID
} & T;

export type TModifiedErrorResponse<T = Record<string, never>> = TBaseResponse & {
    status: typeof REQUEST_STATUS.MODIFIED;
} & T;

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
