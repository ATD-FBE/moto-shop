import { useAppSelector } from '@/hooks/storeHooks.js';

export default function NotificationsBadge() {
    const unreadCount = useAppSelector(state => state.auth.user?.unreadNotificationsCount ?? 0);

    return unreadCount > 0 ? (
        <div className="badge-box single-badge">
            <span className="badge">{unreadCount}</span>
        </div>
    ) : null;
}
