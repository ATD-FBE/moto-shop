import ResourceLoader from './ResourceLoader.jsx';
import MainTitle from './MainTitle.jsx';
import AuthNav from './AuthNav.jsx';
import BurgerMenu from './BurgerMenu.jsx';
import type { JSX } from 'react';
import type { IHeaderContentProps } from '@/types/index.js';

export default function HeaderContentMediumScreen({
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

            <MainTitle />

            <AuthNav
                userRole={userRole}
                userName={userName}
                navigationMap={navigationMap}
                setActiveClass={setActiveClass}
            />
        </div>
    );
}
