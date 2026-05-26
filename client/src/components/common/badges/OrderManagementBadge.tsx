import { useAppSelector } from '@/hooks/storeHooks.js';

export default function OrderManagementBadge() {
    const activeCount = useAppSelector(state => state.auth.user?.activeOrdersCount ?? 0);

    return activeCount > 0 ? (
        <div className="badge-box single-badge">
            <span className="badge">{activeCount}</span>
        </div>
    ) : null;
}
