import { forwardRef, useEffect } from 'react';
import HeaderContentSmallScreen from './main-header/HeaderContentSmallScreen.jsx';
import HeaderContentMediumScreen from './main-header/HeaderContentMediumScreen.jsx';
import HeaderContentLargeScreen from './main-header/HeaderContentLargeScreen.jsx';
import { useAppSelector, useAppDispatch, useAppLocation } from '@/hooks/storeHooks.js';
import { navigationMap } from '@/config/appRouting.js';
import { SCREEN_SIZE } from '@/config/constants.js';
import { setDashboardPanelActivity } from '@/redux/slices/uiSlice.js';
import { USER_ROLE } from '@shared/constants.js';
import type { JSX } from 'react';
import type { INavItem, TScreenSize, IHeaderContentProps } from '@/types/index.js';

const MainHeader = forwardRef<HTMLElement, {}>(function (_, ref): JSX.Element {
    const { screenSize } = useAppSelector(state => state.ui);
    const { isAuthenticated, user } = useAppSelector(state => state.auth);

    const dispatch = useAppDispatch();
    const location = useAppLocation();

    const userRole = isAuthenticated ? user?.role ?? USER_ROLE.GUEST : USER_ROLE.GUEST;
    const userName = isAuthenticated ? user?.name ?? 'Гость' : 'Гость';

    const setActiveClass = (paths: readonly string[]): 'active' | '' =>
        paths?.includes(location.pathname) ? 'active' : '';

    const setFeaturedClass = (navItem: INavItem): 'featured' | '' =>
        navItem.featured ? 'featured' : '';

    const props: IHeaderContentProps = {
        userRole,
        userName,
        navigationMap,
        setActiveClass,
        setFeaturedClass
    };

    const headerContentsBySize: Record<TScreenSize, JSX.Element> = {
        [SCREEN_SIZE.XS]: <HeaderContentSmallScreen {...props} />,
        [SCREEN_SIZE.SMALL]: <HeaderContentSmallScreen {...props} />,
        [SCREEN_SIZE.MEDIUM]: <HeaderContentMediumScreen {...props} />,
        [SCREEN_SIZE.LARGE]: <HeaderContentLargeScreen {...props} />
    };

    const screenSizeKey = Object.entries(SCREEN_SIZE)
        .find(([_, max]) => max === screenSize)
        ?.[0].toLowerCase() ?? 'undefined';

    // Установка флага активности dashboard-панели в хэдере
    useEffect(() => {
        const isDashboardPanelActive =
            screenSize === SCREEN_SIZE.LARGE &&
            !!navigationMap[`${userRole}Dashboard`];
            
        dispatch(setDashboardPanelActivity(isDashboardPanelActive));
    }, [screenSize, userRole, dispatch]);
      
    return (
        <header ref={ref} className={`main-header ${screenSizeKey}-screen ${userRole}-role`}>
            {headerContentsBySize[screenSize] ?? null}
        </header>
    );
});

export default MainHeader;
