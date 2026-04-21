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

interface IPromoCreateBodyBase<TFile> {
    image?: TFile;
    title: string;
    description: string;
    startDate: string;
    endDate: string;
}
interface IPromoUpdateBodyBase<TFile> extends IPromoCreateBodyBase<TFile> {
    removeImage?: string;
}

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
export type TPromoCreateBodyServer = IPromoCreateBodyBase<Express.Multer.File>;
export type TPromoCreateBodyClient = IPromoCreateBodyBase<File>;

export type TPromoCreateResponse =
    | TAuthErrorResponse
    | TValidationErrorResponse<'promotion'>
    | TGeneralErrorResponse
    | TSuccessResponse;

/// Изменение акции ///
export type TPromoUpdateBodyServer = IPromoUpdateBodyBase<Express.Multer.File>;
export type TPromoUpdateBodyClient = IPromoUpdateBodyBase<File>;

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
