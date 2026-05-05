import cn from 'classnames';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import BlockableLink from '@/components/common/BlockableLink.jsx';
import { AUTH_NAV_TYPE } from '@/config/constants.js';
import { setNavigationLock } from '@/redux/slices/uiSlice.js';
import { handleLogout } from '@/services/authService.js';
import type { JSX } from 'react';
import type { INavItem } from '@/types/index.js';
import type { TUserRole } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IAuthNavProps {
    userRole: TUserRole;
    userName: string;
    navigationMap: Record<string, INavItem[]>;
    setActiveClass: (paths?: readonly string[]) => 'active' | '';
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function AuthNav(
    { userRole, userName, navigationMap, setActiveClass }: IAuthNavProps
): JSX.Element {
    const authNavItems = navigationMap[`${userRole}Auth`] || [];
    const dispatch = useAppDispatch();

    const safeHandleLogout = async () => {
        dispatch(setNavigationLock(true));
        await dispatch(handleLogout());
        dispatch(setNavigationLock(false));
    };

    return (
        <div className="auth-wrapper">
            <nav className="auth-nav">
                <ul>
                    {authNavItems.map(navItem => {
                        const label = typeof navItem.label === 'string' ? navItem.label : '';

                        switch (navItem.authType) {
                            case AUTH_NAV_TYPE.USER_LABEL:

                                return (
                                    <li
                                        key={navItem.authType}
                                        className={cn(setActiveClass(navItem.paths))}
                                    >
                                        {label}
                                        <BlockableLink
                                            className="user-name"
                                            to={navItem.paths?.[0] ?? '/'}
                                        >
                                            {userName}
                                        </BlockableLink>
                                    </li>
                                );
                
                            case AUTH_NAV_TYPE.LOGOUT:
                                return (
                                    <li key={navItem.authType}>
                                        <button className="logout-btn" onClick={safeHandleLogout}>
                                            {label}
                                        </button>
                                    </li>
                                );
                
                            case AUTH_NAV_TYPE.LINK:
                            default:
                                return (
                                    <li
                                        key={navItem.paths?.[0]}
                                        className={cn(setActiveClass(navItem.paths))}
                                    >
                                        <BlockableLink to={navItem.paths?.[0] ?? '/'}>
                                            {label}
                                        </BlockableLink>
                                    </li>
                                );
                        }
                    })}
                </ul>
            </nav>
        </div>
    );
}
