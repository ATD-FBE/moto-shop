import { useRef, useEffect } from 'react';
import { useAppSelector, useAppDispatch, useAppLocation } from '@/hooks/storeHooks.js';
import { sendAuthSessionRequest } from '@/api/authRequests.js';
import { routeConfig } from '@/config/appRouting.js';
import { login, adjustUnreadNotificationsCount } from '@/redux/slices/authSlice.js';
import { adjustNewNotificationsCount } from '@/redux/slices/uiSlice.js';
import { saveUserToLocalStorage } from '@/services/authService.js';
import { prepareGuestCartPayload } from '@/services/guestCartService.js';
import { getSseUrl } from '@/helpers/sseHelpers.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { TAppThunk } from '@/types/index.js';

interface ISseMessageData {
    newUnreadNotificationsCount: number;
}

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

    const syncAfterReconnect = async () => {
        const guestCart = prepareGuestCartPayload();
        const responseData = await dispatch(sendAuthSessionRequest({ guestCart }));
        const { status, message } = responseData;

        logRequestStatus({ context: LOG_CTX, status, message });
    
        if (status === REQUEST_STATUS.SUCCESS) {
            const { user: updatedUser, accessTokenExp, refreshTokenExp } = responseData;

            dispatch(login({ user: updatedUser, accessTokenExp, refreshTokenExp }));
            saveUserToLocalStorage(updatedUser);

            const locationPath = locationPathRef.current;
            const isNotificationsPage = routeConfig.customerNotifications.paths.includes(locationPath);

            const oldUnreadNotifsCount = unreadNotificationsCountRef.current;
            const newUnreadNotifsCount = updatedUser.unreadNotificationsCount;

            if (
                isNotificationsPage &&
                typeof newUnreadNotifsCount === 'number' &&
                newUnreadNotifsCount !== oldUnreadNotifsCount
            ) {
                dispatch(adjustNewNotificationsCount(newUnreadNotifsCount - oldUnreadNotifsCount));
            }
        }
    };

    const isSseMessage = (data: any): data is ISseMessageData =>
        data && typeof data === 'object' && typeof data.newUnreadNotificationsCount === 'number';

    const adjustAndSyncUnreadNotificationsCount = (count: number): TAppThunk<void> =>
        (dispatch, getState) => {
            dispatch(adjustUnreadNotificationsCount(count)); // Обновляет user в сторе auth
            saveUserToLocalStorage(getState().auth.user); // Сохраняет обновлённого user локально
        };

    const applySseMessage = (data: ISseMessageData) => {
        const { newUnreadNotificationsCount } = data;

        if (newUnreadNotificationsCount !== 0) {
            dispatch(adjustAndSyncUnreadNotificationsCount(newUnreadNotificationsCount));

            const locationPath = locationPathRef.current;
            const isNotificationsPage = routeConfig.customerNotifications.paths.includes(locationPath);

            if (newUnreadNotificationsCount > 0 && isNotificationsPage) {
                dispatch(adjustNewNotificationsCount(newUnreadNotificationsCount));
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

            // Синхронизация данных сессии после переподключения SSE
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
