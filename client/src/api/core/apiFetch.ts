import { sendAuthRefreshRequest } from '../authRequests.js';
import { PROD_ENV, REFRESH_TOKEN_BUFFER } from '@/config/constants.js';
import { incrementApiRequests, decrementApiRequests } from '@/redux/slices/loadingSlice.js';
import { setAccessTokenExpiry } from '@/redux/slices/authSlice.js';
import { addApiController, removeApiController } from '@/services/apiControllerService.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import waitForRequestDelay from '@/helpers/waitForRequestDelay.js';
import { handleLogout } from '@/services/authService.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import { toError } from '@shared/commonHelpers.js';
import type { IApiFetchConfig, TAppThunk } from '@/types/index.js';

export const API_FETCH_DEFAULT_CONFIG = {
    authRequired: true,
    skipRefreshTokenCheck: false,
    timeout: 10000,
    minDelay: 0,
    errorPrefix: ''
} as const;

const createUnauthorizedResponse = (
    statusCode: number = 401,
    message: string = 'Токены доступа и обновления недействительны'
): Response => {
    const body = JSON.stringify({
        message,
        reason: statusCode === 410 ? REQUEST_STATUS.USER_GONE : REQUEST_STATUS.UNAUTH
    });

    return new Response(body, {
        status: statusCode,
        statusText: statusCode === 410 ? 'Gone' : 'Unauthorized',
        headers: { 'Content-Type': 'application/json' }
    });
};

const apiFetch = (
    url: string,
    options: RequestInit,
    config: IApiFetchConfig = {}
): TAppThunk<Promise<Response>> => async (dispatch, getState) => {
    const isLocalSession = getState().auth.isLocalSession;
    
    const finalConfig = { ...API_FETCH_DEFAULT_CONFIG, ...config };
    const { authRequired, skipRefreshTokenCheck, timeout, minDelay, errorPrefix } = finalConfig;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort('timeout'), timeout);
    const requestTimestamp = Date.now();

    dispatch(incrementApiRequests());
    addApiController(controller);

    try {
        if (isLocalSession && authRequired) {
            throw new Error('Запрос отклонён: запрещено в локальной сессии');
        }

        const response = await fetch(url, {
            credentials: 'include',
            signal: controller.signal,
            ...options
        });

        if (!authRequired) return response;

        const LOG_CTX_CHECK = 'AUTH: REQUEST CHECK';

        // Обновление токена доступа, если недействителен, и повторный вызов запроса при его обновлении
        if (response.status === 401) {
            if (!PROD_ENV) {
                const { message }: { message?: string } = await response.clone().json();
                logRequestStatus({ context: LOG_CTX_CHECK, status: REQUEST_STATUS.UNAUTH, message });
            }

            // Проверка токена обновления в клиенте
            if (!skipRefreshTokenCheck) {
                const refreshTokenExpiresAt = getState().auth.refreshTokenExpiresAt;
                const isRefreshTokenValid = Date.now() + REFRESH_TOKEN_BUFFER < refreshTokenExpiresAt;
    
                if (!isRefreshTokenValid) {
                    logRequestStatus({
                        context: LOG_CTX_CHECK,
                        status: REQUEST_STATUS.UNAUTH,
                        message: 'Срок действия токена обновления истёк'
                    });
    
                    await dispatch(handleLogout({ forceRedirectToLogin: true }));
                    return createUnauthorizedResponse(response.status);
                }
            }

            // Обновление токена доступа
            const responseData = await dispatch(sendAuthRefreshRequest());
            const { status, message } = responseData;
            const LOG_CTX_REFRESH = 'AUTH: REQUEST REFRESH';

            switch (status) {
                case REQUEST_STATUS.SUCCESS: {
                    logRequestStatus({ context: LOG_CTX_REFRESH, status, message });

                    // Переустановка времени действия токена доступа
                    dispatch(setAccessTokenExpiry(responseData.accessTokenExp));

                    // Повторный вызов запроса с отменённым флагом прав
                    return await dispatch(apiFetch(url, options, {
                        ...finalConfig,
                        authRequired: false
                    }));
                }

                case REQUEST_STATUS.UNAUTH: {
                    logRequestStatus({ context: LOG_CTX_REFRESH, status, message });
                    await dispatch(handleLogout({ forceRedirectToLogin: true }));
                    return createUnauthorizedResponse(response.status);
                }

                case REQUEST_STATUS.ERROR:
                    throw new Error(message);

                default:
                    logRequestStatus({ context: LOG_CTX_REFRESH, status, message, unhandled: true });
                    throw new Error(message || '<нет сообщения>');
            }
        }

        // Автовыход, если пользователь удалён
        if (response.status === 410) {
            if (!PROD_ENV) {
                const { message } = await response.clone().json();
                logRequestStatus({ context: LOG_CTX_CHECK, status: REQUEST_STATUS.USER_GONE, message });
            }

            await dispatch(handleLogout({ forceRedirectToLogin: true }));
            return createUnauthorizedResponse(response.status, 'Пользователь не найден');
        }

        return response;
    } catch (err) {
        const reason = err === 'timeout' || err === 'manualAbort'
            ? err
            : (controller.signal.reason || null);
        const isAbortError =
            err instanceof Error && err.name === 'AbortError' ||
            err === 'timeout' ||
            err === 'manualAbort';

        const isTimeout = reason === 'timeout';
        const isAborted = isAbortError && !isTimeout;

        const errorMessage = isTimeout
            ? 'Время ожидания запроса истекло'
            : isAborted
                ? 'Запрос отменен'
                : toError(err).message;

        const statusCode = isTimeout ? 408 : isAborted ? 499 : 500;

        const statusText = isTimeout
            ? 'Request Timeout'
            : isAborted
                ? 'Request Aborted'
                : 'Internal Error';

        const body = JSON.stringify({
            message: `${errorPrefix ? errorPrefix + ': ' : ''}${errorMessage}`
        });

        return new Response(body, {
            status: statusCode,
            statusText,
            headers: { 'Content-Type': 'application/json' }
        });
    } finally {
        clearTimeout(timeoutId);

        await waitForRequestDelay(requestTimestamp, minDelay, controller.signal);

        dispatch(decrementApiRequests());
        removeApiController(controller);
    }
};

export default apiFetch;
