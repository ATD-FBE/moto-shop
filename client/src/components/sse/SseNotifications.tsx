import { useRef, useEffect } from 'react';
import { useAppSelector, useAppDispatch, useAppLocation } from '@/hooks/storeHooks.js';
import { sendAuthSessionRequest } from '@/api/authRequests.js';
import { routeConfig } from '@/config/appRouting.js';
import { login, adjustUnreadNotifications } from '@/redux/slices/authSlice.js';
import { incrementNewNotifications } from '@/redux/slices/uiSlice.js';
import { saveUserToLocalStorage } from '@/services/authService.js';
import { prepareGuestCartPayload } from '@/services/guestCartService.js';
import { getSseUrl } from '@/helpers/sseHelpers.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { TAppThunk } from '@/types/index.js';
import type { ICustomerSseMessageData } from '@shared/types/index.js';

const LOG_CTX = 'SSE: CUSTOMER NOTIFICATION';

export default function SseNotifications(): null {
    const unreadNotificationsCount = useAppSelector(state =>
        state.auth.user?.unreadNotificationsCount ?? 0
    );

    const dispatch = useAppDispatch();
    const location = useAppLocation();

    const locationPathRef = useRef(location.pathname);
    const unreadNotificationsCountRef = useRef(unreadNotificationsCount);
    const wasSseErrorRef = useRef(false);

    const syncAfterReconnect = async (): Promise<void> => {
        const guestCart = prepareGuestCartPayload();
        const responseData = await dispatch(sendAuthSessionRequest({ guestCart }));
        const { status, message } = responseData;

        logRequestStatus({ context: LOG_CTX, status, message });
    
        if (status === REQUEST_STATUS.SUCCESS) {
            const { user: updatedUser, accessTokenExp, refreshTokenExp } = responseData;

            dispatch(login({ user: updatedUser, accessTokenExp, refreshTokenExp }));
            saveUserToLocalStorage(updatedUser);

            const isNotificationsPage = routeConfig.customerNotifications.paths.some(
                path => path === locationPathRef.current
            );

            const oldUnreadNotifsCount = unreadNotificationsCountRef.current;
            const newUnreadNotifsCount = updatedUser.unreadNotificationsCount;

            if (
                isNotificationsPage &&
                typeof newUnreadNotifsCount === 'number' &&
                newUnreadNotifsCount > oldUnreadNotifsCount
            ) {
                dispatch(incrementNewNotifications(newUnreadNotifsCount - oldUnreadNotifsCount));
            }
        }
    };

    const isSseMessage = (data: any): data is ICustomerSseMessageData =>
        data && typeof data === 'object' && typeof data.newUnreadNotificationsChange === 'number';

    const adjustAndSyncUnreadNotifications = (count: number): TAppThunk<void> =>
        (dispatch, getState): void => {
            dispatch(adjustUnreadNotifications(count)); // Обновляет user в сторе auth
            saveUserToLocalStorage(getState().auth.user); // Сохраняет обновлённого user локально
        };

    const applySseMessage = (data: ICustomerSseMessageData) => {
        const { newUnreadNotificationsChange } = data;

        if (newUnreadNotificationsChange !== 0) {
            // Обновление счётчика непрочитанных уведомлений
            dispatch(adjustAndSyncUnreadNotifications(newUnreadNotificationsChange));

            // Увеличение счётчика новых уведомлений для страницы списка всех уведомлений покупателя
            const isNotificationsPage = routeConfig.customerNotifications.paths.some(
                path => path === locationPathRef.current
            );

            if (newUnreadNotificationsChange > 0 && isNotificationsPage) {
                dispatch(incrementNewNotifications(newUnreadNotificationsChange));
            }
        }
    };

    // Запуск SSE (один раз)
    useEffect(() => {
        const eventSource = new EventSource(getSseUrl('notifications'), { withCredentials: true });

        eventSource.onopen = async () => {
            logRequestStatus({
                context: LOG_CTX,
                status: REQUEST_STATUS.SUCCESS,
                message: 'SSE-соединение для уведомлений открыто'
            });

            // Синхронизация данных сессии при переподключениях SSE
            if (wasSseErrorRef.current) {
                syncAfterReconnect();
                wasSseErrorRef.current = false;
            }
        };

        eventSource.onmessage = (event) => {
            let data: unknown;
            try { data = JSON.parse(event.data); } catch { return; } // Для битых данных и мусора
            if (isSseMessage(data)) applySseMessage(data);
        };

        eventSource.onerror = () => {
            logRequestStatus({
                context: LOG_CTX,
                status: REQUEST_STATUS.ERROR,
                message: 'Ошибка соединения SSE для уведомлений'
            });
            wasSseErrorRef.current = true;
        };

        return () => {
            logRequestStatus({
                context: LOG_CTX,
                status: REQUEST_STATUS.SUCCESS,
                message: 'SSE-соединение для уведомлений закрыто'
            });
            eventSource.close();
        }
    }, []);

    // Обновление маршрута
    useEffect(() => {
        locationPathRef.current = location.pathname;
    }, [location.pathname]);

    // Обновление количества непрочитанных уведомлений
    useEffect(() => {
        unreadNotificationsCountRef.current = unreadNotificationsCount;
    }, [unreadNotificationsCount]);

    return null;
}
