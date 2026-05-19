import type {
    TEmptyResponse,
    TAuthErrorResponse,
    TFieldErrorResponse,
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
export type TNewsListResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<INewsListSuccessData>;

interface INewsListSuccessData {
    newsList: INews[];
}

/// Загрузка отдельной новости для редактирования ///
export type TNewsResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<INewsSuccessData>;

interface INewsSuccessData {
    news: INews;
}

/// Создание новости ///
export type TNewsCreateResponse =
    | TAuthErrorResponse
    | TFieldErrorResponse<'news'>
    | TGeneralErrorResponse
    | TSuccessResponse;

/// Изменение новости ///
export type TNewsUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TFieldErrorResponse<'news'>
    | TGeneralErrorResponse
    | TSuccessResponse;

/// Удаление новости ///
export type TNewsDeleteResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse;
