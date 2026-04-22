import NotificationsBase from '@/components/pages/shared/NotificationsBase.jsx';
import NotificationCardManagement from './notification-management/NotificationCardManagement.jsx';
import type { TRenderNotificationCardProps } from '@/types/index.js';

export default function NotificationManagement() {
    return (
        <NotificationsBase
            headerContent={
                <>
                    <h2>Управление уведомлениями</h2>
                    <p>Просмотр отправленных уведомлений и управление черновиками</p>
                </>
            }
            renderNotificationCard={(props: TRenderNotificationCardProps) => (
                <NotificationCardManagement
                    notification={props.notification}
                    notificationArticleRefs={props.notificationArticleRefs}
                    notificationIdsInProgress={props.notificationIdsInProgress}
                    addNotificationIdInProgress={props.addNotificationIdInProgress}
                    removeNotificationIdInProgress={props.removeNotificationIdInProgress}
                    updateNotificationState={props.updateNotificationState}
                    page={props.page}
                    limit={props.limit}
                    totalNotifications={props.totalNotifications}
                    paginatedNotificationsCount={props.paginatedNotificationsCount}
                    setPage={props.setPage}
                    reloadNotifications={props.reloadNotifications}
                />
            )}
        />
    );
}
