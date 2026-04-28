import type {
    TAuthErrorResponse,
    TGeneralErrorResponse,
    TFileResponse
} from './apiResponse.types.js';

export type TCompanyDetailsPdfResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TFileResponse;
