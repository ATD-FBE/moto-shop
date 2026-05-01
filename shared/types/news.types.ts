import type {
    TEmptyResponse,
    TAuthErrorResponse,
    TFormFieldsErrorResponse,
    TGeneralErrorResponse,
    TSuccessResponse
} from './apiResponse.types.js';

/// Общие типы ///
export interface INews {
    id: string;
    publishDate: string;
    title: string;
    content: string;
    createdBy?: string;
    updateHistory?: { updatedBy: string; updatedAt: string }[];
}

export interface INewsBody {
    title: string;
    content: string;
}

/// Загрузка списка новостей ///
interface INewsListSuccessData {
    newsList: INews[];
}
export type TNewsListResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<INewsListSuccessData>;

/// Загрузка отдельной новости для редактирования ///
interface INewsSuccessData {
    news: INews;
}
export type TNewsResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<INewsSuccessData>;

/// Создание новости ///
export type TNewsCreateResponse =
    | TAuthErrorResponse
    | TFormFieldsErrorResponse<'news'>
    | TGeneralErrorResponse
    | TSuccessResponse;

/// Изменение новости ///
export type TNewsUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TFormFieldsErrorResponse<'news'>
    | TGeneralErrorResponse
    | TSuccessResponse;

/// Удаление новости ///
export type TNewsDeleteResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse;
