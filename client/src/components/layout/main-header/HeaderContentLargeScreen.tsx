import cn from 'classnames';
import ResourceLoader from './ResourceLoader.jsx';
import MainTitle from './MainTitle.jsx';
import MainNav from './MainNav.jsx';
import AuthNav from './AuthNav.jsx';
import DashboardNav from './DashboardNav.jsx';
import { useAppSelector } from '@/hooks/storeHooks.js';
import { DASHBOARD_TITLES } from '@/config/constants.js';
import type { JSX } from 'react';
import type { IHeaderContentProps } from '@/types/index.js';

export default function HeaderContentLargeScreen({
    userRole,
    userName,
    navigationMap,
    setActiveClass,
    setFeaturedClass
}: IHeaderContentProps): JSX.Element {
    const isDashboardActive = useAppSelector(state => state.ui.isDashboardPanelActive);
    const dashboardTitle = userRole in DASHBOARD_TITLES
        ? DASHBOARD_TITLES[userRole]
        : `Панель (${userRole})`;

    return (
        <>
            <div className={cn('header-main-panel', { 'dashboard-panel-active': isDashboardActive })}>
                <ResourceLoader />

                <MainTitle />

                <MainNav
                    navigationMap={navigationMap}
                    setActiveClass={setActiveClass}
                    setFeaturedClass={setFeaturedClass}
                />

                <AuthNav
                    userRole={userRole}
                    userName={userName}
                    navigationMap={navigationMap}
                    setActiveClass={setActiveClass}
                />
            </div>

            {isDashboardActive && (
                <div className={`dashboard-panel ${userRole}-role`}>
                    <header className="dashboard-header">
                        <h2>{dashboardTitle}</h2>
                    </header>

                    <DashboardNav
                        userRole={userRole}
                        navigationMap={navigationMap}
                        setActiveClass={setActiveClass}
                        setFeaturedClass={setFeaturedClass}
                    />
                </div>
            )}
        </>
    );
}
