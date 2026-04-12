import { JSX, MouseEvent } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { useAppSelector, useAppDispatch, useAppLocation } from '@/hooks/storeHooks.js';
import { setLockedRouteCancelPath } from '@/redux/slices/uiSlice.js';

export default function BlockableLink(
    { to, children, onClick, ...props }: LinkProps
): JSX.Element {
    const { isNavigationLocked, lockedRoute } = useAppSelector(state => state.ui);
    const dispatch = useAppDispatch();
    const location = useAppLocation();

    const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
        if (!isNavigationLocked) return;

        e.preventDefault();
        console.warn('Навигация заблокирована в данный момент');

        if (
            lockedRoute &&
            location.pathname === lockedRoute.path &&
            !lockedRoute.isCancelFreeze
        ) {
            dispatch(setLockedRouteCancelPath(to));
        }

        if (onClick) onClick(e);
    };

    return (
        <Link to={to} {...props} onClick={handleClick}>
            {children}
        </Link>
    );
}
