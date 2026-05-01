import apiFetch from './core/apiFetch.js';
import apiResponse from './core/apiResponse.js';
import { createFormData } from '@/helpers/formHelpers.js';
import type { TAppThunk } from '@/types/index.js';
import type {
    TPromoListResponse,
    TPromoResponse,
    TPromoCreateBodyClient,
    TPromoCreateResponse,
    TPromoUpdateBodyClient,
    TPromoUpdateResponse,
    TPromoDeleteResponse
} from '@shared/types/index.js';

const PROMO_TIMEOUT = 25000;

/// Загрузка списка акций ///
export const sendPromoListRequest = (
    isAuthenticated: boolean,
    urlParams?: string
): TAppThunk<Promise<TPromoListResponse>> =>
    async (dispatch) => {
        const queryString = urlParams ? `?${urlParams}` : ''
        const url = `/api/promos${queryString}`;
        const options = { method: 'GET' };
        const errorPrefix = 'Не удалось загрузить акции';
        const config = {
            authRequired: isAuthenticated,
            timeout: PROMO_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Загрузка отдельной акции для редактирования ///
export const sendPromoRequest = (promoId: string): TAppThunk<Promise<TPromoResponse>> =>
    async (dispatch) => {
        const url = `/api/promos/${promoId}`;
        const options = { method: 'GET' };
        const errorPrefix = 'Не удалось загрузить акцию';
        const config = {
            authRequired: true,
            timeout: PROMO_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Создание акции ///
export const sendPromoCreateRequest = (
    objData: TPromoCreateBodyClient
): TAppThunk<Promise<TPromoCreateResponse>> =>
    async (dispatch) => {
        const url = '/api/promos';
        const options = {
            method: 'POST',
            body: createFormData(objData)
            // Заголовки для FormData устанавливаются браузером автоматически
        };
        const errorPrefix = 'Не удалось создать акцию';
        const config = {
            authRequired: true,
            timeout: PROMO_TIMEOUT,
            minDelay: 750,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Изменение акции ///
export const sendPromoUpdateRequest = (
    promoId: string,
    objData: TPromoUpdateBodyClient
): TAppThunk<Promise<TPromoUpdateResponse>> =>
    async (dispatch) => {
        const url = `/api/promos/${promoId}`;
        const options = {
            method: 'PUT',
            body: createFormData(objData)
            // Заголовки для FormData устанавливаются браузером автоматически
        };
        const errorPrefix = 'Не удалось изменить акцию';
        const config = {
            authRequired: true,
            timeout: PROMO_TIMEOUT,
            minDelay: 750,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Удаление акции ///
export const sendPromoDeleteRequest = (promoId: string): TAppThunk<Promise<TPromoDeleteResponse>> =>
    async (dispatch) => {
        const url = `/api/promos/${promoId}`;
        const options = { method: 'DELETE' };
        const errorPrefix = 'Не удалось удалить акцию';
        const config = {
            authRequired: true,
            timeout: PROMO_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };
