import type { RefObject, Dispatch, SetStateAction } from 'react';
import type { INotification } from '@shared/types/index.js';

///////////////
/// TOOLBAR ///
///////////////

export type TToolbarControls = 'limit' | 'sort' | 'search' | 'filter' | 'pages' | 'info';

////////////////////
/// NOTIFICATION ///
////////////////////

interface INotificationCardCommonProps {
    notification: INotification;
    notificationArticleRefs: RefObject<Record<string, HTMLElement | null>>;
    notificationIdsInProgress: Set<string>;
    addNotificationIdInProgress: (notificationId: string) => void;
    removeNotificationIdInProgress: (notificationId: string) => void;
    updateNotificationState: (
        notificationId: string,
        notificationUpdateData: Partial<INotification>
    ) => void;
}

export interface INotificationCardCustomerProps extends INotificationCardCommonProps {}

export interface INotificationCardManagementProps extends INotificationCardCommonProps {
    page: number;
    limit: number;
    totalNotifications: number;
    paginatedNotificationsCount: number;
    setPage: Dispatch<SetStateAction<number>>;
    reloadNotifications: () => Promise<boolean>;
}

export type TRenderNotificationCardProps =
    INotificationCardCustomerProps &
    INotificationCardManagementProps;

export interface INewNotificationAlertProps {
    sort: string;
    page: number;
    limit: number;
    totalNotifications: number;
    setPage: Dispatch<SetStateAction<number>>;
    reloadNotifications: () => Promise<boolean>;
}
