import apiFetch from './core/apiFetch.js';
import apiResponse from './core/apiResponse.js';
import type { TAppThunk } from '@/types/index.js';
import type {
    TOrderDraftSyncResponse,
    IOrderDraftCreateBody,
    TOrderDraftCreateResponse,
    IOrderDraftUpdateBody,
    TOrderDraftUpdateResponse,
    IOrderDraftConfirmBody,
    TOrderDraftConfirmResponse,
    TOrderDraftDeleteResponse
} from '@shared/types/index.js';

const CHECKOUT_TIMEOUT = 35000;

/// Синхронизация и загрузка черновика заказа ///
export const sendOrderDraftSyncRequest = (
    orderId: string
): TAppThunk<Promise<TOrderDraftSyncResponse>> =>
    async (dispatch) => {
        const url = `/api/checkout/draft-orders/${orderId}/sync`;
        const options = { method: 'POST' };
        const errorPrefix = 'Не удалось загрузить черновик заказа';
        const config = {
            authRequired: true,
            timeout: CHECKOUT_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Создание черновика заказа ///
export const sendOrderDraftCreateRequest = (
    objData: IOrderDraftCreateBody
): TAppThunk<Promise<TOrderDraftCreateResponse>> =>
    async (dispatch) => {
        const url = '/api/checkout/draft-orders';
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось создать черновик заказа';
        const config = {
            authRequired: true,
            timeout: CHECKOUT_TIMEOUT,
            minDelay: 750,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Изменение черновика заказа ///
export const sendOrderDraftUpdateRequest = (
    orderId: string,
    objData: IOrderDraftUpdateBody
): TAppThunk<Promise<TOrderDraftUpdateResponse>> =>
    async (dispatch) => {
        const url = `/api/checkout/draft-orders/${orderId}`;
        const options = {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось изменить черновик заказа';
        const config = {
            authRequired: true,
            timeout: CHECKOUT_TIMEOUT,
            minDelay: 250,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Подтверждение оформления заказа ///
export const sendOrderDraftConfirmRequest = (
    orderId: string,
    objData: IOrderDraftConfirmBody
): TAppThunk<Promise<TOrderDraftConfirmResponse>> =>
    async (dispatch) => {
        const url = `/api/checkout/draft-orders/${orderId}/confirm`;
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось подтвердить заказ';
        const config = {
            authRequired: true,
            timeout: CHECKOUT_TIMEOUT,
            minDelay: 750,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Отмена оформления заказа ///
export const sendOrderDraftDeleteRequest = (
    orderId: string
): TAppThunk<Promise<TOrderDraftDeleteResponse>> =>
    async (dispatch) => {
        const url = `/api/checkout/draft-orders/${orderId}`;
        const options = { method: 'DELETE' };
        const errorPrefix = 'Не удалось отменить заказ';
        const config = {
            authRequired: true,
            timeout: CHECKOUT_TIMEOUT,
            minDelay: 750,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };
