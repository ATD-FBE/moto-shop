import ResourceLoader from './ResourceLoader.jsx';
import AuthNav from './AuthNav.jsx';
import BurgerMenu from './BurgerMenu.jsx';
import type { JSX } from 'react';
import type { IHeaderContentProps } from '@/types/index.js';

export default function HeaderContentSmallScreen({
    userRole,
    userName,
    navigationMap,
    setActiveClass,
    setFeaturedClass
}: IHeaderContentProps): JSX.Element {
    return (
        <div className="header-main-panel">
            <BurgerMenu
                userRole={userRole}
                navigationMap={navigationMap}
                setActiveClass={setActiveClass}
                setFeaturedClass={setFeaturedClass}
            />

            <ResourceLoader />

            <AuthNav
                userRole={userRole}
                userName={userName}
                navigationMap={navigationMap}
                setActiveClass={setActiveClass}
            />
        </div>
    );
}
