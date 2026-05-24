import type {
    TEmptyResponse,
    TAuthErrorResponse,
    TFieldErrorResponse,
    TGeneralErrorResponse,
    TSuccessResponse
} from './apiResponse.types.js';
import type { IBaseQuery } from './shared.types.js';

////////////
/// MAIN ///
////////////

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

////////////////
/// REQUESTS ///
////////////////

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

/// Загрузка списка акций ///
export type TPromoListQuery = IBaseQuery;

export type TPromoListResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<IPromoListSuccessData>;

interface IPromoListSuccessData {
    promoList: IPromo[];
}

/// Загрузка отдельной акции для редактирования ///
export type TPromoResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<IPromoSuccessData>;

interface IPromoSuccessData {
    promo: IPromo;
}

/// Создание акции ///
export type TPromoCreateBodyServer = IPromoCreateBodyBase<Express.Multer.File>;
export type TPromoCreateBodyClient = IPromoCreateBodyBase<File>;

export type TPromoCreateResponse =
    | TAuthErrorResponse
    | TFieldErrorResponse<'promotion'>
    | TGeneralErrorResponse
    | TSuccessResponse;

/// Изменение акции ///
export type TPromoUpdateBodyServer = IPromoUpdateBodyBase<Express.Multer.File>;
export type TPromoUpdateBodyClient = IPromoUpdateBodyBase<File>;

export type TPromoUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TFieldErrorResponse<'promotion'>
    | TGeneralErrorResponse
    | TSuccessResponse;

/// Удаление акции ///
export type TPromoDeleteResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse;
