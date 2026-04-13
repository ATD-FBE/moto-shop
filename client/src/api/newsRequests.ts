import apiFetch from './core/apiFetch.js';
import apiResponse from './core/apiResponse.js';
import type { TAppThunk } from '@/types/index.js';
import type {
    INewsBody,
    TNewsListResponse,
    TNewsResponse,
    TNewsCreateResponse,
    TNewsUpdateResponse,
    TNewsDeleteResponse
} from '@shared/types/index.js';

const NEWS_TIMEOUT = 20000;

/// Загрузка всех новостей ///
export const sendNewsListRequest = (isAuthenticated: boolean): TAppThunk<Promise<TNewsListResponse>> =>
    async (dispatch) => {
        const url = '/api/news';
        const options = { method: 'GET' };
        const errorPrefix = 'Не удалось загрузить новости';
        const config = {
            authRequired: isAuthenticated,
            timeout: NEWS_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Загрузка отдельной новости для редактирования ///
export const sendNewsRequest = (newsId: string): TAppThunk<Promise<TNewsResponse>> =>
    async (dispatch) => {
        const url = `/api/news/${newsId}`;
        const options = { method: 'GET' };
        const errorPrefix = 'Не удалось загрузить новость';
        const config = {
            authRequired: true,
            timeout: NEWS_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Создание новости ///
export const sendNewsCreateRequest = (objData: INewsBody): TAppThunk<Promise<TNewsCreateResponse>> =>
    async (dispatch) => {
        const url = '/api/news';
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось опубликовать новость';
        const config = {
            authRequired: true,
            timeout: NEWS_TIMEOUT,
            minDelay: 750,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Изменение новости ///
export const sendNewsUpdateRequest = (
    newsId: string,
    objData: INewsBody
): TAppThunk<Promise<TNewsUpdateResponse>> =>
    async (dispatch) => {
        const url = `/api/news/${newsId}`;
        const options = {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось изменить новость';
        const config = {
            authRequired: true,
            timeout: NEWS_TIMEOUT,
            minDelay: 750,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Удаление новости ///
export const sendNewsDeleteRequest = (newsId: string): TAppThunk<Promise<TNewsDeleteResponse>> =>
    async (dispatch) => {
        const url = `/api/news/${newsId}`;
        const options = { method: 'DELETE' };
        const errorPrefix = 'Не удалось удалить новость';
        const config = {
            authRequired: true,
            timeout: NEWS_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };
