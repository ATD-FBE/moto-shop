import apiFetch from './core/apiFetch.js';
import apiResponse from './core/apiResponse.js';
import { createFormData } from '@/helpers/formHelpers.js';
import type { TAppThunk } from '@/types/index.js';
import type {
    TProductsPageContext,
    TProductListResponse,
    TProductResponse,
    TProductCreateBodyClient,
    TProductCreateResponse,
    TProductUpdateBodyClient,
    TProductUpdateResponse,
    IBulkProductUpdateBody,
    TBulkProductUpdateResponse,
    TProductDeleteResponse,
    IBulkProductDeleteBody,
    TBulkProductDeleteResponse
} from '@shared/types/index.js';

const PRODUCT_TIMEOUT = 35000;

/// Загрузка ID отфильтрованных товаров и их данных для одной страницы ///
export const sendProductListRequest = (
    isAuthenticated: boolean,
    pageContext: TProductsPageContext,
    urlParams: string
): TAppThunk<Promise<TProductListResponse>> =>
    async (dispatch) => {
        const params = new URLSearchParams(urlParams);
        params.set('pageContext', pageContext);
        
        const url = `/api/catalog/products?${params.toString()}`;
        const options = { method: 'GET' };
        const errorPrefix = 'Не удалось загрузить товары';
        const config = {
            authRequired: isAuthenticated,
            timeout: PRODUCT_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Загрузка отдельного товара на его странице ///
export const sendProductRequest = (
    isAuthenticated: boolean,
    productId: string
): TAppThunk<Promise<TProductResponse>> =>
    async (dispatch) => {
        const url = `/api/catalog/products/${productId}`;
        const options = { method: 'GET' };
        const errorPrefix = 'Не удалось загрузить товар';
        const config = {
            authRequired: isAuthenticated,
            timeout: PRODUCT_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Создание товара ///
export const sendProductCreateRequest = (
    objData: TProductCreateBodyClient
): TAppThunk<Promise<TProductCreateResponse>> =>
    async (dispatch) => {
        const url = '/api/catalog/products';
        const options = {
            method: 'POST',
            body: createFormData(objData)
            // Заголовки для FormData устанавливаются браузером автоматически
        };
        const errorPrefix = 'Не удалось создать товар';
        const config = {
            authRequired: true,
            timeout: PRODUCT_TIMEOUT,
            minDelay: 750,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Изменение товара ///
export const sendProductUpdateRequest = (
    productId: string,
    objData: TProductUpdateBodyClient
): TAppThunk<Promise<TProductUpdateResponse>> =>
    async (dispatch) => {
        const url = `/api/catalog/products/${productId}`;
        const options = {
            method: 'PUT',
            body: createFormData(objData)
            // Заголовки для FormData устанавливаются браузером автоматически
        };
        const errorPrefix = 'Не удалось изменить товар';
        const config = {
            authRequired: true,
            timeout: PRODUCT_TIMEOUT,
            minDelay: 750,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Изменение группы товаров ///
export const sendBulkProductUpdateRequest = (
    objData: IBulkProductUpdateBody
): TAppThunk<Promise<TBulkProductUpdateResponse>> =>
    async (dispatch) => {
        const url = '/api/catalog/products/bulk';
        const options = {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось изменить группу товаров';
        const config = {
            authRequired: true,
            timeout: PRODUCT_TIMEOUT,
            minDelay: 750,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Удаление товара ///
export const sendProductDeleteRequest = (
    productId: string
): TAppThunk<Promise<TProductDeleteResponse>> =>
    async (dispatch) => {
        const url = `/api/catalog/products/${productId}`;
        const options = { method: 'DELETE' };
        const errorPrefix = 'Не удалось удалить товар';
        const config = {
            authRequired: true,
            timeout: PRODUCT_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Удаление группы товаров ///
export const sendBulkProductDeleteRequest = (
    objData: IBulkProductDeleteBody
): TAppThunk<Promise<TBulkProductDeleteResponse>> =>
    async (dispatch) => {
        const url = '/api/catalog/products/bulk';
        const options = {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось удалить группу товаров';
        const config = {
            authRequired: true,
            timeout: PRODUCT_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };
