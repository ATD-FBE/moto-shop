import apiFetch from './core/apiFetch.js';
import apiResponse from './core/apiResponse.js';
import type { TAppThunk } from '@/types/index.js';
import type {
    IAuthRegistrationBody,
    TAuthRegistrationResponse,
    IAuthLoginBody,
    TAuthLoginResponse,
    IAuthUserUpdateBody,
    TAuthUserUpdateResponse,
    IAuthSessionBody,
    TAuthSessionResponse,
    TAuthRefreshResponse,
    TAuthCheckoutPrefsResponse,
    IAuthCheckoutPrefsUpdateBody,
    TAuthCheckoutPrefsUpdateResponse,
    TAuthLogoutResponse
} from '@shared/types/index.js';

const AUTH_TIMEOUT = 20000;

/// Регистрация ///
export const sendAuthRegistrationRequest = (
    objData: IAuthRegistrationBody
): TAppThunk<Promise<TAuthRegistrationResponse>> =>
    async (dispatch) => {
        const url = '/api/auth/register';
        const options: RequestInit = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Ошибка регистрации';
        const config = {
            authRequired: false,
            timeout: AUTH_TIMEOUT,
            minDelay: 750,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse<TAuthRegistrationResponse>(response, { errorPrefix });
    };

/// Авторизация ///
export const sendAuthLoginRequest = (
    objData: IAuthLoginBody
): TAppThunk<Promise<TAuthLoginResponse>> =>
    async (dispatch) => {
        const url = '/api/auth/login';
        const options: RequestInit = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Ошибка авторизации';
        const config = {
            authRequired: false,
            timeout: AUTH_TIMEOUT,
            minDelay: 750,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse<TAuthLoginResponse>(response, { errorPrefix });
    };

/// Изменение данных пользователя ///
export const sendAuthUserUpdateRequest = (
    objData: IAuthUserUpdateBody
): TAppThunk<Promise<TAuthUserUpdateResponse>> =>
    async (dispatch) => {
        const url = '/api/auth/user';
        const options: RequestInit = {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось изменить данные пользователя';
        const config = {
            authRequired: true,
            timeout: AUTH_TIMEOUT,
            minDelay: 750,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse<TAuthUserUpdateResponse>(response, { errorPrefix });
    };

/// Загрузка данных сессии пользователя ///
export const sendAuthSessionRequest = (
    objData: IAuthSessionBody
): TAppThunk<Promise<TAuthSessionResponse>> =>
    async (dispatch) => {
        const url = '/api/auth/session';
        const options: RequestInit = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось получить данные пользователя';
        const config = {
            authRequired: true,
            skipRefreshTokenCheck: true,
            timeout: AUTH_TIMEOUT,
            minDelay: 750,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse<TAuthSessionResponse>(response, { errorPrefix });
    };

/// Обновление токена доступа ///
export const sendAuthRefreshRequest = (): TAppThunk<Promise<TAuthRefreshResponse>> =>
    async (dispatch) => {
        const url = '/api/auth/refresh';
        const options: RequestInit = { method: 'POST' };
        const errorPrefix = 'Не удалось обновить токен доступа';
        const config = {
            authRequired: false,
            timeout: AUTH_TIMEOUT,
            minDelay: 0,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse<TAuthRefreshResponse>(response, { errorPrefix });
    };

/// Загрузка настроек заказа ///
export const sendAuthCheckoutPrefsRequest = (): TAppThunk<Promise<TAuthCheckoutPrefsResponse>> =>
    async (dispatch) => {
        const url = '/api/auth/checkout-prefs';
        const options: RequestInit = { method: 'GET' };
        const errorPrefix = 'Не удалось загрузить настройки заказа';
        const config = {
            authRequired: true,
            timeout: AUTH_TIMEOUT,
            minDelay: 500,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse<TAuthCheckoutPrefsResponse>(response, { errorPrefix });
    };

/// Изменение настроек заказа ///
export const sendAuthCheckoutPrefsUpdateRequest = (
    objData: IAuthCheckoutPrefsUpdateBody
): TAppThunk<Promise<TAuthCheckoutPrefsUpdateResponse>> =>
    async (dispatch) => {
        const url = '/api/auth/checkout-prefs';
        const options: RequestInit = {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(objData)
        };
        const errorPrefix = 'Не удалось изменить настройки заказа';
        const config = {
            authRequired: true,
            timeout: 10000,
            minDelay: 750,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse<TAuthCheckoutPrefsUpdateResponse>(response, { errorPrefix });
    };

/// Выход из сессии ///
export const sendAuthLogoutRequest = (): TAppThunk<Promise<TAuthLogoutResponse>> =>
    async (dispatch) => {
        const url = '/api/auth/logout';
        const options: RequestInit = { method: 'POST' };
        const errorPrefix = 'Ошибка выхода из сессии';
        const config = {
            authRequired: false,
            timeout: AUTH_TIMEOUT,
            minDelay: 0,
            errorPrefix
        };

        const response = await dispatch(apiFetch(url, options, config));
        return await apiResponse<TAuthLogoutResponse>(response, { errorPrefix });
    };
