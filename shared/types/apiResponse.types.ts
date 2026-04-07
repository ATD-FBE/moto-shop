import { REQUEST_STATUS } from '@shared/constants.js';
import type { TRequestStatus, TEntityType, TFieldErrors } from './shared.types.js';

export interface IEmptyResponse {
    status: typeof REQUEST_STATUS.UNCHANGED;
}

export interface IBaseResponse {
    message: string;
    status: TRequestStatus;
    reason?: TRequestStatus;
}

export interface IErrorResponse extends IBaseResponse {
    status:
        | typeof REQUEST_STATUS.BAD_REQUEST
        | typeof REQUEST_STATUS.ERROR
        | typeof REQUEST_STATUS.NETWORK;
}

export interface IAuthErrorResponse extends IBaseResponse {
    status:
        | typeof REQUEST_STATUS.UNAUTH
        | typeof REQUEST_STATUS.USER_GONE
        | typeof REQUEST_STATUS.DENIED
        | typeof REQUEST_STATUS.FORBIDDEN;
}

export interface IValidationErrorResponse<E extends TEntityType> extends IBaseResponse {
    status: typeof REQUEST_STATUS.INVALID;
    fieldErrors: TFieldErrors<E>;
}

export type TSuccessResponse<Data> = IBaseResponse & Data & {
    status: typeof REQUEST_STATUS.SUCCESS
};
