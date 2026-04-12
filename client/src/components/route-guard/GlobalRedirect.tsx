import { ReactNode, JSX } from 'react';
import { Navigate } from 'react-router-dom';
import { useAppSelector, useAppLocation } from '@/hooks/storeHooks.js';

export default function GlobalRedirect(
    { children }: { children: ReactNode }
): JSX.Element {
    const { lockedRoute } = useAppSelector(state => state.ui);
    const { isAuthenticated, suppressAuthRedirect } = useAppSelector(state => state.auth);
    const location = useAppLocation();

    if (
        lockedRoute &&
        isAuthenticated &&
        !suppressAuthRedirect &&
        location.pathname !== lockedRoute.path
    ) {
        return <Navigate to={lockedRoute.path} replace />;
    }

    return <>{children}</>;
}
