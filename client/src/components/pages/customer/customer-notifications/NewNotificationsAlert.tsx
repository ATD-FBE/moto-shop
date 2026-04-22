import { useState, useEffect } from 'react';
import cn from 'classnames';
import { useAppSelector, useAppDispatch } from '@/hooks/storeHooks.js';
import { resetNewNotifications } from '@/redux/slices/uiSlice.js';
import type { JSX } from 'react';
import type { INewNotificationAlertProps } from '@/types/index.js';

export default function NewNotificationsAlert({
    sort,
    page,
    limit,
    totalNotifications,
    setPage,
    reloadNotifications
}: INewNotificationAlertProps): JSX.Element {
    const newNotificationsCount = useAppSelector(state => state.ui.newNotificationsCount);
    const [newNotificationsAvailable, setNewNotificationsAvailable] = useState(false);
    const dispatch = useAppDispatch();

    const getTargetPageForNewNotifications = (): number => {
        if (sort.includes('sentAt')) {
            return sort.startsWith('-')
                ? 1
                : Math.ceil((totalNotifications + newNotificationsCount) / limit);
        }
        return 1;
    };

    const showNewNotifications = async (): Promise<void> => {
        const targetPage = getTargetPageForNewNotifications();

        if (page === targetPage) {
            setNewNotificationsAvailable(false);
            const isSuccess = await reloadNotifications();
            if (!isSuccess) setNewNotificationsAvailable(true);
        } else {
            const currentTotalPages = Math.ceil(totalNotifications / limit);

            if (targetPage > currentTotalPages) {
                setNewNotificationsAvailable(false);
                const isSuccess = await reloadNotifications(); // Обновление нового количества страниц

                if (isSuccess) {
                    setPage(targetPage); // Триггер загрузки данных для выбранной страницы
                } else {
                    setNewNotificationsAvailable(true);
                }
            } else {
                setPage(targetPage); // Триггер загрузки данных для выбранной страницы
            }
        }
    };

    // Сброс флага и счётчика новых уведомлений при размонтировании
    useEffect(() => {
        return () => {
            dispatch(resetNewNotifications());
        };
    }, [dispatch]);

    // Установка флага доступности новых уведомлений
    useEffect(() => {
        if (newNotificationsCount > 0) setNewNotificationsAvailable(true);
    }, [newNotificationsCount]);

    // Сброс флага новых уведомлений при изменении параметров, если сообщение на выбранной странице
    useEffect(() => {
        const targetPage = getTargetPageForNewNotifications();
        if (page === targetPage) setNewNotificationsAvailable(false);
    }, [sort, page, limit]);

    // Сброс счётчика новых уведомлений после изменения количества уведомлений (уже включает их в себя)
    useEffect(() => {
        dispatch(resetNewNotifications());
    }, [totalNotifications, dispatch]);

    return (
        <div className={cn(
            'new-items-alert',
            'notifications',
            { 'enabled': newNotificationsAvailable }
        )}>
            <p>Получены новые уведомления!</p>
            <button
                className="load-items-btn"
                onClick={showNewNotifications}
                disabled={!newNotificationsAvailable}
            >
                <span className="icon">🔔</span>
                Загрузить
            </button>
        </div>
    );
}
