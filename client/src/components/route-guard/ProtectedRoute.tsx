import { Navigate } from 'react-router-dom';
import { useAppSelector, useAppLocation } from '@/hooks/storeHooks.js';
import { routeConfig } from '@/config/appRouting.js';
import { USER_ROLE } from '@shared/constants.js';
import type { JSX, ReactElement } from 'react';
import type { TRouteConfig } from '@/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IProtectedRouteProps {
    access: TRouteConfig[keyof TRouteConfig]['access'];
    children: ReactElement;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function ProtectedRoute(
    { access, children }: IProtectedRouteProps
): JSX.Element {
    const {
        isAuthenticated,
        user,
        suppressAuthRedirect,
        forceRedirectToLogin
    } = useAppSelector(state => state.auth);
    const location = useAppLocation();

    const loginPath = routeConfig.login.paths[0];

    // Аварийный выход на страницу авторизации при UNAUTH (401) и USER_GONE (410)
    if (forceRedirectToLogin && location.pathname !== loginPath) {
        return <Navigate to={loginPath} state={{ from: location }} replace />;
    }

    // Защита маршрутов в соответствии с их доступом и роли пользователя
    const userRole = user?.role || USER_ROLE.GUEST;
    const isPrivilegedUser = isAuthenticated && userRole === USER_ROLE.ADMIN;
    const personalPath = userRole !== USER_ROLE.GUEST
        ? routeConfig[`${userRole}Personal`]?.paths[0] || '/'
        : '/';

    switch (access) {
        case 'admin':
            if (!isAuthenticated || !isPrivilegedUser) {
                return <Navigate to={isAuthenticated ? personalPath : loginPath} replace />;
            }
            return children;

        case 'customer':
            if (!isAuthenticated || isPrivilegedUser) {
                return <Navigate to={isAuthenticated ? personalPath : loginPath} replace />;
            }
            return children;

        case 'auth':
            if (isAuthenticated && !suppressAuthRedirect) {
                return <Navigate to={personalPath} replace />;
            }
            return children;

        case 'public':
        default:
            return children;
    }
}
