import { Link } from 'react-router-dom';
import { useAppSelector, useAppDispatch, useAppLocation } from '@/hooks/storeHooks.js';
import { setLockedRouteCancelPath } from '@/redux/slices/uiSlice.js';
import type { JSX, MouseEvent } from 'react';
import type { LinkProps } from 'react-router-dom';

export default function BlockableLink(
    { to, children, onClick, ...props }: LinkProps
): JSX.Element {
    const { isNavigationLocked, lockedRoute } = useAppSelector(state => state.ui);
    const dispatch = useAppDispatch();
    const location = useAppLocation();

    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
        if (to === '#') {
            e.preventDefault();
        }

        if (isNavigationLocked) {
            e.preventDefault();
            console.warn('Навигация заблокирована в данный момент');
    
            if (
                lockedRoute &&
                location.pathname === lockedRoute.path &&
                !lockedRoute.isCancelFreeze
            ) {
                dispatch(setLockedRouteCancelPath(to));
            }
        }

        if (onClick) onClick(e);
    };

    return (
        <Link to={to} {...props} onClick={handleClick}>
            {children}
        </Link>
    );
}
