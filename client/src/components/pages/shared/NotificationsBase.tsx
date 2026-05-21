import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppLocation } from '@/hooks/storeHooks.js';
import Toolbar from '@/components/common/Toolbar.jsx';
import { getInitSortParam, getInitPageParam, getInitLimitParam } from '@/helpers/urlParamsHelper.js';
import { notificationsSortOptions } from '@shared/sortOptions.js';
import { notificationsPageLimitOptions } from '@shared/pageLimitOptions.js';
import { sendNotificationListRequest } from '@/api/notificationRequests.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import { LOAD_STATUS_MIN_HEIGHT, DATA_LOAD_STATUS } from '@/config/constants.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { ReactNode, JSX, RefObject, Dispatch, SetStateAction } from 'react';
import type {
    TDataLoadStatus,
    TToolbarControls,
    TRenderNotificationCardProps,
    INewNotificationAlertProps
} from '@/types/index.js';
import type { INotification } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface INotificationsBaseProps {
    showSort?: boolean;
    headerContent: ReactNode;
    renderNotificationCard: (props: TRenderNotificationCardProps) => ReactNode;
    renderNewNotificationsAlert?: (props: INewNotificationAlertProps) => ReactNode;
}

interface INotificationsMainProps {
    loadStatus: TDataLoadStatus;
    reloadNotifications: () => Promise<boolean>;
    paginatedNotificationList: INotification[];
    notificationArticleRefs: RefObject<Record<string, HTMLElement | null>>;
    notificationIdsInProgress: Set<string>;
    addNotificationIdInProgress: (notificationId: string) => void;
    removeNotificationIdInProgress: (notificationId: string) => void;
    updateNotificationState: (
        notificationId: string,
        notificationUpdateData: Partial<INotification>
    ) => void;
    page: number;
    limit: number;
    totalNotifications: number;
    setPage: Dispatch<SetStateAction<number>>;
    renderNotificationCard: (props: TRenderNotificationCardProps) => ReactNode;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////
 
export default function NotificationsBase({
    showSort = false,
    headerContent,
    renderNotificationCard,
    renderNewNotificationsAlert
}: INotificationsBaseProps): JSX.Element | null {
    const [initialized, setInitialized] = useState(false);

    const [sort, setSort] = useState<string>(notificationsSortOptions[0].dbField);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState<number>(notificationsPageLimitOptions[0]);

    const [initNotificationsReady, setInitNotificationsReady] = useState(false);
    const [notificationsLoading, setNotificationsLoading] = useState(true);
    const [notificationsLoadError, setNotificationsLoadError] = useState(false);
    const [notificationIdsInProgress, setNotificationIdsInProgress] = useState<Set<string>>(new Set());
    const [totalNotifications, setTotalNotifications] = useState(0);
    const [paginatedNotificationList, setPaginatedNotificationList] = useState<INotification[]>([]);

    const notificationArticleRefs = useRef<Record<string, HTMLElement | null>>({});
    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();
    const location = useAppLocation();
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
        notificationIdsInProgress.size > 0;

    const toolbarTopActiveControls: TToolbarControls[] = ['limit', 'pages'];
    if (showSort) toolbarTopActiveControls.splice(1, 0, 'sort');

    const addNotificationIdInProgress = (notificationId: string): void => {
        setNotificationIdsInProgress(prev => {
            const newSet = new Set(prev);
            newSet.add(notificationId);
            return newSet;
        });
    };

    const removeNotificationIdInProgress = (notificationId: string): void => {
        setNotificationIdsInProgress(prev => {
            const newSet = new Set(prev);
            newSet.delete(notificationId);
            return newSet;
        });
    };

    const loadNotifications = async (urlParams: string): Promise<boolean> => {
        setNotificationsLoadError(false);
        setNotificationsLoading(true);

        const responseData = await dispatch(sendNotificationListRequest(urlParams));
        if (isUnmountedRef.current) return false;

        const { status, message } = responseData;
        logRequestStatus({ context: 'NOTIFICATION: LOAD LIST', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            setNotificationsLoadError(true);
        } else {
            const { notificationsCount, paginatedNotificationList } = responseData;

            setTotalNotifications(notificationsCount);
            setPaginatedNotificationList(paginatedNotificationList);
            setInitNotificationsReady(true);
        }

        setNotificationsLoading(false);

        return status === REQUEST_STATUS.SUCCESS; // Для NewNotificationsAlert
    };

    const reloadNotifications = async (): Promise<boolean> => {
        const urlParams = location.search.slice(1);
        return await loadNotifications(urlParams);
    };

    const updateNotificationState = (
        notificationId: string,
        notificationUpdateData: Partial<INotification>
    ): void => {
        setPaginatedNotificationList(prev => prev.map(notification =>
            notification.id === notificationId
                ? { ...notification, ...notificationUpdateData }
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
        const params = new URLSearchParams({
            ...(showSort && { sort: String(sort) }),
            page: String(page),
            limit: String(limit)
        });
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
                sort={sort}
                setSort={setSort}
                sortOptions={notificationsSortOptions}
                page={page}
                setPage={setPage}
                limit={limit}
                setLimit={setLimit}
                limitOptions={notificationsPageLimitOptions}
                initDataReady={initNotificationsReady}
                totalItems={totalNotifications}
                uiBlocked={isNotificationUiBlocked}
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
                page={page}
                setPage={setPage}
                limit={limit}
                loadStatus={notificationsLoadStatus}
                initDataReady={initNotificationsReady}
                totalItems={totalNotifications}
                label="Уведомления"
                uiBlocked={isNotificationUiBlocked}
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
}: INotificationsMainProps): JSX.Element {
    const [notificationsMainHeight, setNotificationsMainHeight] = useState(LOAD_STATUS_MIN_HEIGHT);
    const notificationsMainRef = useRef<HTMLDivElement | null>(null);

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
                        {renderNotificationCard({
                            notification,
                            notificationArticleRefs,
                            notificationIdsInProgress,
                            addNotificationIdInProgress,
                            removeNotificationIdInProgress,
                            updateNotificationState,
                            page,
                            limit,
                            totalNotifications,
                            paginatedNotificationsCount: paginatedNotificationList.length,
                            setPage,
                            reloadNotifications
                        })}
                    </li>
                ))}
            </ul>
        </div>
    );
}
