import apiFetch from './core/apiFetch.js';
import apiResponse from './core/apiResponse.js';
import type { TAppThunk } from '@/types/index.js';
import type {
    IGuestCartItemListBody,
    TGuestCartItemListResponse,
    TCartItemListResponse,
    ICartItemUpdateBody,
    TCartItemUpdateResponse,
    ICartItemRestoreBody,
    TCartItemRestoreResponse,
    TCartWarningsFixResponse,
    TCartItemRemoveResponse,
    TCartClearResponse
} from '@shared/types/index.js';

const CART_TIMEOUT = 15000;

/// Синхронизация гостевой корзины ///
export const sendGuestCartItemListRequest = (
    objData: IGuestCartItemListBody
): TAppThunk<Promise<TGuestCartItemListResponse>> =>
    async (dispatch) => {
        const url = '/api/cart/guest';
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось синхронизировать гостевую корзину';
        const config = {
            authRequired: false,
            timeout: CART_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Загрузка серверной корзины ///
export const sendCartItemListRequest = (): TAppThunk<Promise<TCartItemListResponse>> =>
    async (dispatch) => {
        const url = '/api/cart';
        const options = { method: 'GET' };
        const errorPrefix = 'Не удалось загрузить корзину аккаунта';
        const config = {
            authRequired: true,
            timeout: CART_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Добавление/изменение количества/удаление товара в корзине ///
export const sendCartItemUpdateRequest = (
    productId: string,
    objData: ICartItemUpdateBody
): TAppThunk<Promise<TCartItemUpdateResponse>> =>
    async (dispatch) => {
        const url = `/api/cart/items/${productId}`;
        const options = {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось изменить количество товара в корзине';
        const config = {
            authRequired: true,
            timeout: CART_TIMEOUT,
            minDelay: 250,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Восстановление товара в корзине ///
export const sendCartItemRestoreRequest = (
    productId: string,
    objData: ICartItemRestoreBody
): TAppThunk<Promise<TCartItemRestoreResponse>> =>
    async (dispatch) => {
        const url = `/api/cart/items/restore/${productId}`;
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось восстановить товар в корзине';
        const config = {
            authRequired: true,
            timeout: CART_TIMEOUT,
            minDelay: 250,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Исправление всех проблемных товаров в корзине ///
export const sendCartWarningsFixRequest = (): TAppThunk<Promise<TCartWarningsFixResponse>> =>
    async (dispatch) => {
        const url = '/api/cart/warnings';
        const options = { method: 'PATCH' };
        const errorPrefix = 'Не удалось исправить проблемные товары в корзине';
        const config = {
            authRequired: true,
            timeout: CART_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Удаление товара из корзины ///
export const sendCartItemRemoveRequest = (
    productId: string
): TAppThunk<Promise<TCartItemRemoveResponse>> =>
    async (dispatch) => {
        const url = `/api/cart/items/${productId}`;
        const options = { method: 'DELETE' };
        const errorPrefix = 'Не удалось удалить товар из корзины';
        const config = {
            authRequired: true,
            timeout: CART_TIMEOUT,
            minDelay: 250,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Очистка корзины ///
export const sendCartClearRequest = (): TAppThunk<Promise<TCartClearResponse>> =>
    async (dispatch) => {
        const url = '/api/cart/clear';
        const options = { method: 'DELETE' };
        const errorPrefix = 'Не удалось очистить корзину';
        const config = {
            authRequired: true,
            timeout: CART_TIMEOUT,
            minDelay: 250,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };
