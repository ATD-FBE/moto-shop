import apiFetch from './core/apiFetch.js';
import apiResponse from './core/apiResponse.js';
import type { TAppThunk } from '@/types/index.js';
import type {
    TCustomerListResponse,
    TCustomerOrderListResponse,
    ICustomerDiscountUpdateBody,
    TCustomerDiscountUpdateResponse,
    ICustomerBanStatusUpdateBody,
    TCustomerBanStatusUpdateResponse
} from '@shared/types/index.js';

const CUSTOMER_TIMEOUT = 30000;

/// Загрузка ID отфильтрованных клиентов и их данных для одной страницы таблицы ///
export const sendCustomerListRequest = (urlParams: string): TAppThunk<Promise<TCustomerListResponse>> =>
    async (dispatch) => {
        const url = `/api/customers?${urlParams}`;
        const options = { method: 'GET' };
        const errorPrefix = 'Не удалось загрузить данные клиентов';
        const config = {
            authRequired: true,
            timeout: CUSTOMER_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Загрузка заказов клиента в таблице ///
export const sendCustomerOrderListRequest = (
    customerId: string,
    urlParams: string
): TAppThunk<Promise<TCustomerOrderListResponse>> =>
    async (dispatch) => {
        const url = `/api/customers/${customerId}/orders?${urlParams}`;
        const options = { method: 'GET' };
        const errorPrefix = 'Не удалось загрузить заказы клиента';
        const config = {
            authRequired: true,
            timeout: CUSTOMER_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Изменение скидки клиента ///
export const sendCustomerDiscountUpdateRequest = (
    customerId: string,
    objData: ICustomerDiscountUpdateBody
): TAppThunk<Promise<TCustomerDiscountUpdateResponse>> =>
    async (dispatch) => {
        const url = `/api/customers/${customerId}/discount`;
        const options = {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось измененить скидку клиента';
        const config = {
            authRequired: true,
            timeout: CUSTOMER_TIMEOUT,
            minDelay: 250,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Изменение статуса блокировки клиента ///
export const sendCustomerBanStatusUpdateRequest = (
    customerId: string,
    objData: ICustomerBanStatusUpdateBody
): TAppThunk<Promise<TCustomerBanStatusUpdateResponse>> => async (dispatch) => {
    const url = `/api/customers/${customerId}/ban`;
    const options = {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(objData)
    };
    const errorPrefix = 'Не удалось измененить статус блокировки клиента';
    const config = {
        authRequired: true,
        timeout: CUSTOMER_TIMEOUT,
        minDelay: 250,
        errorPrefix
    };

    const response = await dispatch(apiFetch(url, options, config));
    return await apiResponse(response, { errorPrefix });
};
