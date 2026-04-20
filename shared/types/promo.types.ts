import type {
    TEmptyResponse,
    TAuthErrorResponse,
    TValidationErrorResponse,
    TGeneralErrorResponse,
    TSuccessResponse
} from './apiResponse.types.js';

/// Общие типы ///
export interface IPromo {
    id: string;
    title: string;
    image?: string;
    description: string;
    startDate: string;
    endDate: string;
    createdBy?: string;
    createdAt?: string;
    updateHistory?: { updatedBy: string; updatedAt: string }[];
}

interface IPromoBodyBase<TFile> {
    image?: TFile;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
}
type TPromoBodyBaseServer = IPromoBodyBase<Express.Multer.File>;
type TPromoBodyBaseClient = IPromoBodyBase<File>;

/// Загрузка всех акций ///
export interface IPromoListQuery {
    timestamp?: string;
    timeZoneOffset?: string;
}

interface IPromoListSuccessData {
    promoList: IPromo[];
}
export type TPromoListResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<IPromoListSuccessData>;

/// Загрузка отдельной акции для редактирования ///
interface IPromoSuccessData {
    promo: IPromo;
}
export type TPromoResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<IPromoSuccessData>;

/// Создание акции ///
export interface IPromoCreateBodyServer extends TPromoBodyBaseServer {}
export interface IPromoCreateBodyClient extends TPromoBodyBaseClient {}

export type TPromoCreateResponse =
    | TAuthErrorResponse
    | TValidationErrorResponse<'promotion'>
    | TGeneralErrorResponse
    | TSuccessResponse;

/// Изменение акции ///
export interface IPromoUpdateBodyServer extends TPromoBodyBaseServer {
    removeImage?: string;
}
export interface IPromoUpdateBodyClient extends TPromoBodyBaseClient {
    removeImage?: string;
}

export type TPromoUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TValidationErrorResponse<'promotion'>
    | TGeneralErrorResponse
    | TSuccessResponse;

/// Удаление акции ///
export type TPromoDeleteResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse;
