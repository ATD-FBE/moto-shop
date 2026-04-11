import { useRef, useEffect } from 'react';
import { useAppSelector, useAppDispatch, useAppLocation } from '@/hooks/storeHooks.js';
import { sendAuthSessionRequest } from '@/api/authRequests.js';
import { routeConfig } from '@/config/appRouting.js';
import { login, adjustManagedActiveOrdersCount } from '@/redux/slices/authSlice.js';
import { adjustNewManagedActiveOrdersCount } from '@/redux/slices/uiSlice.js';
import { saveUserToLocalStorage } from '@/services/authService.js';
import { prepareGuestCartPayload } from '@/services/guestCartService.js';
import { getSseUrl } from '@/helpers/sseHelpers.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { TAppThunk } from '@/types/index.js';
import type { IOrderUpdate, IAdminSseMessageData } from '@shared/types/index.js';

type TOrderUpdateHandler = (orderUpdate: IOrderUpdate) => void;

const LOG_CTX = 'SSE: ORDER MANAGEMENT';

// Подписка внутренних страниц на обновление со своим обработчиком
const orderUpdateSubscribers: Set<TOrderUpdateHandler> = new Set();

export const subscribeToOrderUpdates = (fn: TOrderUpdateHandler): (() => void) => {
    orderUpdateSubscribers.add(fn);

    // Возвращение функции, удаляющей хэндлер из подписчика для очистки при размонтировании
    return () => {
        orderUpdateSubscribers.delete(fn);
    };
};

export const notifyOrderUpdate = (orderUpdate: IOrderUpdate): void => {
    orderUpdateSubscribers.forEach(fn => fn(orderUpdate));
};

// SSE
export default function SseOrderManagement(): null {
    const managedActiveOrdersCount = useAppSelector(state =>
        state.auth.user?.managedActiveOrdersCount ?? 0
    );

    const dispatch = useAppDispatch();
    const location = useAppLocation();

    const locationPathRef = useRef(location.pathname);
    const managedActiveOrdersCountRef = useRef(managedActiveOrdersCount);
    const wasSseErrorRef = useRef(false);

    const syncAfterReconnect = async (): Promise<void> => {
        const guestCart = prepareGuestCartPayload();
        const responseData = await dispatch(sendAuthSessionRequest({ guestCart }));
        const { status, message } = responseData;

        logRequestStatus({ context: LOG_CTX, status, message });
    
        if (status === REQUEST_STATUS.SUCCESS) {
            const { user: updatedUser, accessTokenExp, refreshTokenExp } = responseData;

            saveUserToLocalStorage(updatedUser);
            dispatch(login({ user: updatedUser, accessTokenExp, refreshTokenExp }));

            const isAdminOrdersPage = routeConfig.adminOrders.paths.includes(locationPathRef.current);

            const oldActiveOrdersCount = managedActiveOrdersCountRef.current;
            const newActiveOrdersCount = updatedUser.managedActiveOrdersCount;

            if (
                isAdminOrdersPage &&
                typeof newActiveOrdersCount === 'number' &&
                newActiveOrdersCount !== oldActiveOrdersCount
            ) {
                dispatch(adjustNewManagedActiveOrdersCount(newActiveOrdersCount - oldActiveOrdersCount));
            }
        }
    };

    const isOrderManagementSseMessage = (data: any): data is IAdminSseMessageData => {
        const hasActiveOrdersCount = typeof data?.newManagedActiveOrdersCount === 'number';
        
        const hasOrderUpdate = 
            data?.orderUpdate && 
            typeof data.orderUpdate === 'object' && 
            'orderId' in data.orderUpdate;
    
        return hasActiveOrdersCount || hasOrderUpdate;
    };

    const adjustAndSyncManagedActiveOrdersCount = (count: number): TAppThunk<void> =>
        (dispatch, getState): void => {
            dispatch(adjustManagedActiveOrdersCount(count)); // Обновляет user в сторе auth
            saveUserToLocalStorage(getState().auth.user); // Сохраняет обновлённого user локально
        };

    const applySseMessage = (data: IAdminSseMessageData) => {
        const { newManagedActiveOrdersCount, orderUpdate } = data;

        if (typeof newManagedActiveOrdersCount === 'number' && newManagedActiveOrdersCount !== 0) {
            // Обновление счётчика активных заказов
            dispatch(adjustAndSyncManagedActiveOrdersCount(newManagedActiveOrdersCount));

            // Обновление счётчика новых заказов для страницы списка всех заказов админа
            const isAdminOrdersPage = routeConfig.adminOrders.paths.includes(locationPathRef.current);

            if (newManagedActiveOrdersCount > 0 && isAdminOrdersPage) {
                dispatch(adjustNewManagedActiveOrdersCount(newManagedActiveOrdersCount));
            }
        }

        // Применение апдейта заказа для страниц, на которых была подписка на него
        if (orderUpdate) {
            notifyOrderUpdate(orderUpdate);
        }
    };

    // Запуск SSE (один раз)
    useEffect(() => {
        const eventSource = new EventSource(getSseUrl('order-management'), { withCredentials: true });

        eventSource.onopen = async () => {
            logRequestStatus({
                context: LOG_CTX,
                status: REQUEST_STATUS.SUCCESS,
                message: 'SSE-соединение для управления заказами открыто'
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
            if (isOrderManagementSseMessage(data)) applySseMessage(data);
        };

        eventSource.onerror = () => {
            logRequestStatus({
                context: LOG_CTX,
                status: REQUEST_STATUS.ERROR,
                message: 'Ошибка соединения SSE для управления заказами'
            });
            wasSseErrorRef.current = true;
        };

        return () => {
            logRequestStatus({
                context: LOG_CTX,
                status: REQUEST_STATUS.SUCCESS,
                message: 'SSE-соединение для управления заказами закрыто'
            });
            eventSource.close();
        };
    }, []);

    // Обновление маршрута
    useEffect(() => {
        locationPathRef.current = location.pathname;
    }, [location.pathname]);

    // Обновление количества активных заказов
    useEffect(() => {
        managedActiveOrdersCountRef.current = managedActiveOrdersCount;
    }, [managedActiveOrdersCount]);

    return null;
}
