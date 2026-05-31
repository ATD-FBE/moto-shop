import cn from 'classnames';
import BlockableLink from '@/components/common/BlockableLink.jsx';
import CartBadge from '@/components/common/badges/CartBadge.jsx';
import NotificationsBadge from '@/components/common/badges/NotificationsBadge.jsx';
import OrderManagementBadge from '@/components/common/badges/OrderManagementBadge.jsx';
import type { JSX } from 'react';
import type { IHeaderContentProps } from '@/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TDashboardNavProps = Pick<IHeaderContentProps,
    | 'userRole'
    | 'navigationMap'
    | 'setActiveClass'
    | 'setFeaturedClass'
>;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function DashboardNav({
    userRole,
    navigationMap,
    setActiveClass,
    setFeaturedClass
}: TDashboardNavProps): JSX.Element {
    const dashboardNavItems = navigationMap[`${userRole}Dashboard`] ?? [];

    return (
        <nav className={`dashboard-nav ${userRole}-role`}>
            <ul>
                {dashboardNavItems.map(navItem => (
                    <li
                        key={navItem.paths[0]}
                        className={cn(setFeaturedClass(navItem), setActiveClass(navItem.paths))}
                    >
                        <BlockableLink to={navItem.paths[0]}>
                            {typeof navItem.label === 'string' ? navItem.label : navItem.paths[0]}
                            {navItem.badge === 'cart' && <CartBadge />}
                            {navItem.badge === 'notifications' && <NotificationsBadge />}
                            {navItem.badge === 'order-management' && <OrderManagementBadge />}
                        </BlockableLink>
                    </li>
                ))}
            </ul>
        </nav>
    );
}
