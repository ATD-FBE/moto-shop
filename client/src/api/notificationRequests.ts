import apiFetch from './core/apiFetch.js';
import apiResponse from './core/apiResponse.js';
import type { TAppThunk } from '@/types/index.js';
import type {
    INotificationBody,
    TNotificationListResponse,
    TNotificationResponse,
    TNotificationCreateResponse,
    TNotificationUpdateResponse,
    TNotificationSendingResponse,
    TNotificationMarkAsReadResponse,
    TNotificationDeleteResponse
} from '@shared/types/index.js';

const NOTIFICATION_TIMEOUT = 30000;

/// Загрузка списка уведомлений на страницу (для управления админом или просмотра клиентом) ///
export const sendNotificationListRequest = (
    urlParams: string
): TAppThunk<Promise<TNotificationListResponse>> =>
    async (dispatch) => {
        const url = `/api/notifications?${urlParams}`;
        const options = { method: 'GET' };
        const errorPrefix = 'Не удалось загрузить уведомления';
        const config = {
            authRequired: true,
            timeout: NOTIFICATION_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Загрузка черновика уведомления для редактирования ///
export const sendNotificationRequest = (
    notificationId: string
): TAppThunk<Promise<TNotificationResponse>> =>
    async (dispatch) => {
        const url = `/api/notifications/${notificationId}`;
        const options = { method: 'GET' };
        const errorPrefix = 'Не удалось загрузить уведомление';
        const config = {
            authRequired: true,
            timeout: NOTIFICATION_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Создание черновика уведомления ///
export const sendNotificationCreateRequest = (
    objData: INotificationBody
): TAppThunk<Promise<TNotificationCreateResponse>> =>
    async (dispatch) => {
        const url = '/api/notifications';
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось создать уведомление';
        const config = {
            authRequired: true,
            timeout: NOTIFICATION_TIMEOUT,
            minDelay: 750,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Изменение черновика уведомления ///
export const sendNotificationUpdateRequest = (
    notificationId: string,
    objData: INotificationBody
): TAppThunk<Promise<TNotificationUpdateResponse>> =>
    async (dispatch) => {
        const url = `/api/notifications/${notificationId}`;
        const options = {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось изменить уведомление';
        const config = {
            authRequired: true,
            timeout: NOTIFICATION_TIMEOUT,
            minDelay: 750,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Отправка уведомления ///
export const sendNotificationSendingRequest = (
    notificationId: string
): TAppThunk<Promise<TNotificationSendingResponse>> =>
    async (dispatch) => {
        const url = `/api/notifications/${notificationId}/send`;
        const options = { method: 'PATCH' };
        const errorPrefix = 'Не удалось отправить уведомление';
        const config = {
            authRequired: true,
            timeout: NOTIFICATION_TIMEOUT,
            minDelay: 750,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Отметка уведомления как прочитанного ///
export const sendNotificationMarkAsReadRequest = (
    notificationId: string
): TAppThunk<Promise<TNotificationMarkAsReadResponse>> =>
    async (dispatch) => {
        const url = `/api/notifications/${notificationId}/read`;
        const options = { method: 'PATCH' };
        const errorPrefix = 'Не удалось отметить уведомление как прочитанное';
        const config = {
            authRequired: true,
            timeout: NOTIFICATION_TIMEOUT,
            minDelay: 250,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };

/// Удаление черновика уведомления ///
export const sendNotificationDeleteRequest = (
    notificationId: string
): TAppThunk<Promise<TNotificationDeleteResponse>> =>
    async (dispatch) => {
        const url = `/api/notifications/${notificationId}`;
        const options = { method: 'DELETE' };
        const errorPrefix = 'Не удалось удалить уведомление';
        const config = {
            authRequired: true,
            timeout: NOTIFICATION_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse(response, { errorPrefix });
    };
