import apiFetch from './core/apiFetch.js';
import apiResponse from './core/apiResponse.js';
import type { TAppThunk } from '@/types/index.js';
import type {
    TOrderListResponse,
    TOrderResponse,
    TOrderItemsAvailabilityResponse,
    TOrderRepeatResponse,
    IOrderInternalNoteUpdateBody,
    TOrderInternalNoteUpdateResponse,
    IOrderDetailsUpdateBody,
    TOrderDetailsUpdateResponse,
    IOrderItemsUpdateBody,
    TOrderItemsUpdateResponse,
    IOrderStatusUpdateBody,
    TOrderStatusUpdateResponse
} from '@shared/types/index.js';

const ORDER_TIMEOUT = 35000;

/// Загрузка списка заказов для одной страницы ///
export const sendOrderListRequest = (
    urlParams: string
): TAppThunk<Promise<TOrderListResponse>> =>
    async (dispatch) => {
        const url = `/api/orders?${urlParams}`;
        const options = { method: 'GET' };
        const errorPrefix = 'Не удалось загрузить заказы';
        const config = {
            authRequired: true,
            timeout: ORDER_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Загрузка или обновление отдельного заказа ///
export const sendOrderRequest = (
    orderId: string,
    urlParams: string
): TAppThunk<Promise<TOrderResponse>> =>
    async (dispatch) => {
        const url = `/api/orders/${orderId}?${urlParams}`;
        const options = { method: 'GET' };
        const errorPrefix = 'Не удалось загрузить заказ';
        const config = {
            authRequired: true,
            timeout: ORDER_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Загрузка доступного на складе количества товаров в заказе ///
export const sendOrderItemsAvailabilityRequest = (
    orderId: string
): TAppThunk<Promise<TOrderItemsAvailabilityResponse>> =>
    async (dispatch) => {
        const url = `/api/orders/${orderId}/items/availability`;
        const options = { method: 'GET' };
        const errorPrefix = 'Не удалось получить доступное на складе количество товаров из заказа';
        const config = {
            authRequired: true,
            timeout: ORDER_TIMEOUT,
            minDelay: 0,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Повтор завершённого или отменённого заказа ///
export const sendOrderRepeatRequest = (
    orderId: string
): TAppThunk<Promise<TOrderRepeatResponse>> =>
    async (dispatch) => {
        const url = `/api/orders/${orderId}/repeat`;
        const options = { method: 'POST' };
        const errorPrefix = 'Ошибка при повторе заказа';
        const config = {
            authRequired: true,
            timeout: ORDER_TIMEOUT,
            minDelay: 750,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Изменение внутренней заметки заказа (SSE) ///
export const sendOrderInternalNoteUpdateRequest = (
    orderId: string,
    objData: IOrderInternalNoteUpdateBody
): TAppThunk<Promise<TOrderInternalNoteUpdateResponse>> =>
    async (dispatch) => {
        const url = `/api/orders/${orderId}/internal-note`;
        const options = {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось изменить внутреннюю заметку заказа';
        const config = {
            authRequired: true,
            timeout: ORDER_TIMEOUT,
            minDelay: 0,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Изменение деталей подтверждённого заказа (SSE) ///
export const sendOrderDetailsUpdateRequest = (
    orderId: string,
    objData: IOrderDetailsUpdateBody
): TAppThunk<Promise<TOrderDetailsUpdateResponse>> =>
    async (dispatch) => {
        const url = `/api/orders/${orderId}`;
        const options = {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось изменить заказ';
        const config = {
            authRequired: true,
            timeout: ORDER_TIMEOUT,
            minDelay: 0,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Изменение товаров подтверждённого заказа (SSE) ///
export const sendOrderItemsUpdateRequest = (
    orderId: string,
    objData: IOrderItemsUpdateBody
): TAppThunk<Promise<TOrderItemsUpdateResponse>> =>
    async (dispatch) => {
        const url = `/api/orders/${orderId}/items`;
        const options = {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось изменить товары в заказе';
        const config = {
            authRequired: true,
            timeout: ORDER_TIMEOUT,
            minDelay: 0,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Изменение статуса заказа (SSE) ///
export const sendOrderStatusUpdateRequest = (
    orderId: string,
    objData: IOrderStatusUpdateBody
): TAppThunk<Promise<TOrderStatusUpdateResponse>> =>
    async (dispatch) => {
        const url = `/api/orders/${orderId}/status`;
        const options = {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось изменить статус заказа';
        const config = {
            authRequired: true,
            timeout: ORDER_TIMEOUT,
            minDelay: 0,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };
// @ts-ignore
/// Генерация и загрузка счёта заказа в pdf ///
export const sendOrderInvoicePdfRequest = (orderId) => async (dispatch) => {
    const url = `/api/orders/${orderId}/financials/invoice/pdf`;
    const options = { method: 'GET' };
    const errorPrefix = 'Не удалось загрузить счёт';
    const config = {
        authRequired: true,
        timeout: ORDER_TIMEOUT,
        minDelay: 0,
        errorPrefix
    };

    const response = await dispatch(apiFetch(url, options, config));
    return await apiResponse(response, { errorPrefix, asFile: true });
};
// @ts-ignore
/// Вычисление и загрузка остатка для оплаты заказа банковской картой онлайн ///
export const sendOrderRemainingAmountRequest = (orderId) => async (dispatch) => {
    const url = `/api/orders/${orderId}/financials/remaining`;
    const options = { method: 'GET' };
    const errorPrefix = 'Не удалось вычислить остаток оплаты заказа';
    const config = {
        authRequired: true,
        timeout: ORDER_TIMEOUT,
        minDelay: 250,
        errorPrefix
    };

    const response = await dispatch(apiFetch(url, options, config));
    return await apiResponse(response, { errorPrefix });
};
// @ts-ignore
/// Аннулирование записи успешного финансового события в заказе (SSE) ///
export const sendOrderFinancialsEventVoidRequest = (params, objData) => async (dispatch) => {
    const { orderId, eventId } = params;
    const url = `/api/orders/${orderId}/financials/events/${eventId}/void`;
    const options = {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(objData)
    };
    const errorPrefix = 'Не удалось аннулировать запись в истории финансов заказа';
    const config = {
        authRequired: true,
        timeout: ORDER_TIMEOUT,
        minDelay: 0,
        errorPrefix
    };

    const response = await dispatch(apiFetch(url, options, config));
    return await apiResponse(response, { errorPrefix });
};
// @ts-ignore
/// Внесение оплаты за заказ оффлайн-методом (SSE) ///
export const sendOrderOfflinePaymentApplyRequest = (orderId, objData) => async (dispatch) => {
    const url = `/api/orders/${orderId}/financials/payments/offline`;
    const options = {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(objData)
    };
    const errorPrefix = 'Не удалось внести оплату заказа оффлайн-методом';
    const config = {
        authRequired: true,
        timeout: ORDER_TIMEOUT,
        minDelay: 0,
        errorPrefix
    };

    const response = await dispatch(apiFetch(url, options, config));
    return await apiResponse(response, { errorPrefix });
};
// @ts-ignore
/// Возврат средств за заказ оффлайн-методом (SSE) ///
export const sendOrderOfflineRefundApplyRequest = (orderId, objData) => async (dispatch) => {
    const url = `/api/orders/${orderId}/financials/refunds/offline`;
    const options = {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(objData)
    };
    const errorPrefix = 'Не удалось вернуть средства оффлайн-методом';
    const config = {
        authRequired: true,
        timeout: ORDER_TIMEOUT,
        minDelay: 0,
        errorPrefix
    };

    const response = await dispatch(apiFetch(url, options, config));
    return await apiResponse(response, { errorPrefix });
};
// @ts-ignore
/// Создание онлайн платежа для банковской карты ///
export const sendOrderOnlinePaymentCreateRequest = (orderId, objData) => async (dispatch) => {
    const url = `/api/orders/${orderId}/financials/payments/online`;
    const options = {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(objData)
    };
    const errorPrefix = 'Не удалось создать онлайн-платёж для карты';
    const config = {
        authRequired: true,
        timeout: ORDER_TIMEOUT,
        minDelay: 750,
        errorPrefix
    };

    const response = await dispatch(apiFetch(url, options, config));
    return await apiResponse(response, { errorPrefix });
};
// @ts-ignore
/// Создание возвратов для банковских карт ///
export const sendOrderOnlineRefundsCreateRequest = (orderId) => async (dispatch) => {
    const url = `/api/orders/${orderId}/financials/refunds/online/full`;
    const options = { method: 'POST' };
    const errorPrefix = 'Не удалось создать онлайн-возвраты на карты';
    const config = {
        authRequired: true,
        timeout: ORDER_TIMEOUT,
        minDelay: 750,
        errorPrefix
    };

    const response = await dispatch(apiFetch(url, options, config));
    return await apiResponse(response, { errorPrefix });
};
