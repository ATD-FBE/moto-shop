import { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';
import Toolbar from '@/components/common/Toolbar.jsx';
import { getInitSortParam, getInitPageParam, getInitLimitParam } from '@/helpers/initParamsHelper.js';
import { notificationsSortOptions } from '@shared/sortOptions.js';
import { notificationsPageLimitOptions } from '@shared/pageLimitOptions.js';
import { sendNotificationListRequest } from '@/api/notificationRequests.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import { LOAD_STATUS_MIN_HEIGHT, DATA_LOAD_STATUS } from '@/config/constants.js';
import { REQUEST_STATUS } from '@shared/constants.js';
 
export default function NotificationsBase({
    showSort = false,
    headerContent,
    renderNotificationCard,
    renderNewNotificationsAlert
}) {
    const [initialized, setInitialized] = useState(false);

    const [sort, setSort] = useState(notificationsSortOptions[0].dbField);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(notificationsPageLimitOptions[0]);

    const [initNotificationsReady, setInitNotificationsReady] = useState(false);
    const [notificationsLoading, setNotificationsLoading] = useState(true);
    const [notificationsLoadError, setNotificationsLoadError] = useState(false);
    const [notificationIdsInProgress, setNotificationIdsInProgress] = useState(new Set());
    const [totalNotifications, setTotalNotifications] = useState(0);
    const [paginatedNotificationList, setPaginatedNotificationList] = useState([]);

    const notificationArticleRefs = useRef({});
    const isUnmountedRef = useRef(false);

    const dispatch = useDispatch();
    const location = useLocation();
    const navigate = useNavigate();
    
    const notificationsLoadStatus =
        notificationsLoading
            ? DATA_LOAD_STATUS.LOADING
            : notificationsLoadError
                ? DATA_LOAD_STATUS.ERROR
                : !totalNotifications
                    ? DATA_LOAD_STATUS.NOT_FOUND
                    : DATA_LOAD_STATUS.READY;

    const isNotificationUiBlocked =
        notificationsLoading ||
        notificationsLoadError ||
        notificationIdsInProgress.size;

    const toolbarTopActiveControls = ['limit', 'pages'];
    if (showSort) toolbarTopActiveControls.splice(1, 0, 'sort');

    const addNotificationIdInProgress = (notificationId) => {
        setNotificationIdsInProgress(prev => {
            const newSet = new Set(prev);
            newSet.add(notificationId);
            return newSet;
        });
    };

    const removeNotificationIdInProgress = (notificationId) => {
        setNotificationIdsInProgress(prev => {
            const newSet = new Set(prev);
            newSet.delete(notificationId);
            return newSet;
        });
    };

    const loadNotifications = async (urlParams) => {
        setNotificationsLoadError(false);
        setNotificationsLoading(true);

        const responseData = await dispatch(sendNotificationListRequest(urlParams));
        if (isUnmountedRef.current) return;

        const { status, message, notificationsCount, paginatedNotificationList } = responseData;
        logRequestStatus({ context: 'NOTIFICATION: LOAD LIST', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            setNotificationsLoadError(true);
        } else {
            setTotalNotifications(notificationsCount);
            setPaginatedNotificationList(paginatedNotificationList);
            setInitNotificationsReady(true);
        }

        setNotificationsLoading(false);

        return status === REQUEST_STATUS.SUCCESS; // Для NewNotificationsAlert
    };

    const reloadNotifications = async () => {
        const urlParams = location.search.slice(1);
        return await loadNotifications(urlParams);
    };

    const updateNotificationState = (notificationId, updatedNotificationData) => {
        setPaginatedNotificationList(prev => prev.map(notification =>
            notification.id === notificationId
                ? { ...notification, ...updatedNotificationData }
                : notification
        ));
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Установка начальных значений параметров компонента и очистка флага при размонтировании
    useEffect(() => {
        const params = new URLSearchParams(location.search);

        if (showSort) setSort(getInitSortParam(params, notificationsSortOptions));
        setPage(getInitPageParam(params));
        setLimit(getInitLimitParam(params, notificationsPageLimitOptions));
        
        setInitialized(true);
    }, [showSort]);

    // Запрос на загрузку уведомлений с заданными параметрами
    useEffect(() => {
        if (!initialized) return;

        // Обновление параметров URL и загрузка уведомлений
        const params = new URLSearchParams({ ...(showSort && { sort }), page, limit });
        const urlParams = params.toString();

        if (location.search !== `?${urlParams}`) {
            const newUrl = `${location.pathname}?${urlParams}`;
            navigate(newUrl, { replace: true });
        }
        
        loadNotifications(urlParams);
    }, [initialized, showSort, sort, page, limit, dispatch]);

    if (!initialized) return null;

    return (
        <div className="notifications-page">
            <header className="notifications-header">
                {headerContent}
            </header>

            <Toolbar
                position="top"
                activeControls={toolbarTopActiveControls}
                uiBlocked={isNotificationUiBlocked}
                initDataReady={initNotificationsReady}
                sort={sort}
                setSort={setSort}
                sortOptions={notificationsSortOptions}
                page={page}
                setPage={setPage}
                limit={limit}
                setLimit={setLimit}
                limitOptions={notificationsPageLimitOptions}
                totalItems={totalNotifications}
            />

            <NotificationsMain
                loadStatus={notificationsLoadStatus}
                reloadNotifications={reloadNotifications}
                paginatedNotificationList={paginatedNotificationList}
                notificationIdsInProgress={notificationIdsInProgress}
                notificationArticleRefs={notificationArticleRefs}
                addNotificationIdInProgress={addNotificationIdInProgress}
                removeNotificationIdInProgress={removeNotificationIdInProgress}
                updateNotificationState={updateNotificationState}
                page={page}
                limit={limit}
                totalNotifications={totalNotifications}
                setPage={setPage}
                renderNotificationCard={renderNotificationCard}
            />

            <Toolbar
                position="bottom"
                activeControls={['info', 'pages']}
                loadStatus={notificationsLoadStatus}
                uiBlocked={isNotificationUiBlocked}
                initDataReady={initNotificationsReady}
                page={page}
                setPage={setPage}
                limit={limit}
                totalItems={totalNotifications}
                label="Уведомления"
            />

            {renderNewNotificationsAlert?.({
                sort,
                page,
                limit,
                totalNotifications,
                setPage,
                reloadNotifications
            })}
        </div>
    );
}

function NotificationsMain({
    loadStatus,
    reloadNotifications,
    paginatedNotificationList,
    notificationArticleRefs,
    notificationIdsInProgress,
    addNotificationIdInProgress,
    removeNotificationIdInProgress,
    updateNotificationState,
    page,
    limit,
    totalNotifications,
    setPage,
    renderNotificationCard
}) {
    const [notificationsMainHeight, setNotificationsMainHeight] = useState(LOAD_STATUS_MIN_HEIGHT);
    const notificationsMainRef = useRef(null);

    useEffect(() => {
        if (!notificationsMainRef.current) return;

        const newHeight = notificationsMainRef.current.offsetHeight;
        if (newHeight !== notificationsMainHeight) setNotificationsMainHeight(newHeight);
    }, [loadStatus]);

    if (loadStatus === DATA_LOAD_STATUS.LOADING) {
        return (
            <div
                className="notifications-main"
                style={{ height: Math.max(LOAD_STATUS_MIN_HEIGHT, notificationsMainHeight) }}
            >
                <div className="notifications-load-status">
                    <p>
                        <span className="icon load">⏳</span>
                        Загрузка уведомлений...
                    </p>
                </div>
            </div>
        );
    }

    if (loadStatus === DATA_LOAD_STATUS.ERROR) {
        return (
            <div
                ref={notificationsMainRef}
                className="notifications-main"
                style={{ height: LOAD_STATUS_MIN_HEIGHT }}
            >
                <div className="notifications-load-status">
                    <p>
                        <span className="icon error">❌</span>
                        Ошибка сервера. Уведомления не доступны.
                    </p>
                    <button className="reload-btn" onClick={reloadNotifications}>Повторить</button>
                </div>
            </div>
        );
    }

    if (loadStatus === DATA_LOAD_STATUS.NOT_FOUND) {
        return (
            <div
                ref={notificationsMainRef}
                className="notifications-main"
                style={{ height: LOAD_STATUS_MIN_HEIGHT }}
            >
                <div className="notifications-load-status">
                    <p>
                        <span className="icon not-found">🔎</span>
                        На данный момент уведомлений нет.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div ref={notificationsMainRef} className="notifications-main">
            <ul className="notification-list">
                {paginatedNotificationList.map(notification => (
                    <li key={notification.id} className="notification-item">
                        {renderNotificationCard?.(notification, {
                            notificationArticleRefs,
                            notificationIdsInProgress,
                            addNotificationIdInProgress,
                            removeNotificationIdInProgress,
                            updateNotificationState,
                            reloadNotifications,
                            page,
                            limit,
                            totalNotifications,
                            paginatedNotificationsCount: paginatedNotificationList.length,
                            setPage
                        })}
                    </li>
                ))}
            </ul>
        </div>
    );
}
