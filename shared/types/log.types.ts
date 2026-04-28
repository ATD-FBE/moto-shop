import type {
    TAuthErrorResponse,
    TGeneralErrorResponse,
    TTextResponse
} from './apiResponse.types.js';

export type TErrorLogsResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TTextResponse;
