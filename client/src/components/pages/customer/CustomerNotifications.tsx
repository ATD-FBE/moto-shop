import NotificationsBase from '@/components/pages/shared/NotificationsBase.jsx';
import NotificationCardCustomer from './customer-notifications/NotificationCardCustomer.jsx';
import NewNotificationsAlert from './customer-notifications/NewNotificationsAlert.jsx';
import type { JSX } from 'react';
import type { TRenderNotificationCardProps, INewNotificationAlertProps } from '@/types/index.js';

export default function CustomerNotifications(): JSX.Element {
    return (
        <NotificationsBase
            showSort={true}
            headerContent={<h2>Просмотр уведомлений</h2>}
            renderNotificationCard={(props: TRenderNotificationCardProps) => (
                <NotificationCardCustomer
                    notification={props.notification}
                    notificationArticleRefs={props.notificationArticleRefs}
                    notificationIdsInProgress={props.notificationIdsInProgress}
                    addNotificationIdInProgress={props.addNotificationIdInProgress}
                    removeNotificationIdInProgress={props.removeNotificationIdInProgress}
                    updateNotificationState={props.updateNotificationState}
                />
            )}
            renderNewNotificationsAlert={(props: INewNotificationAlertProps) => (
                <NewNotificationsAlert {...props} />
            )}
        />
    );
}
