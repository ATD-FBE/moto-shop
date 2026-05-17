import { useState, useRef, useEffect, createElement } from 'react';
import { useOutlet } from 'react-router-dom';
import Breadcrumbs from '@/components/common/Breadcrumbs.jsx';
import { useAppSelector, useAppDispatch, useAppLocation } from '@/hooks/storeHooks.js';
import { routeConfig } from '@/config/appRouting.js';
import { checkAuth } from '@/services/authService.js';
import { setNavigationLock } from '@/redux/slices/uiSlice.js';
import { abortAllApiControllers } from '@/services/apiControllerService.js';
import type { JSX, ReactNode } from 'react';

export default function ProtectedPageContent(): JSX.Element {
    const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
    const [displayedContent, setDisplayedContent] = useState<ReactNode>(null);

    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();
    const location = useAppLocation();

    // Контент страницы вложенного маршрута (статичен). Если отсутствует - страница не найдена.
    const outlet = useOutlet() || createElement(routeConfig.notFound.component);

    // Маршрут для хлебных крошек
    const [breadcrumbPath, setBreadcrumbPath] = useState(location.pathname);

    const handleRouteChange = async () => {
        abortAllApiControllers(); // Отмена API-запросов через контроллеры

        if (isAuthenticated) {
            dispatch(setNavigationLock(true));

            await dispatch(checkAuth());
            if (isUnmountedRef.current) return;

            dispatch(setNavigationLock(false));
        }

        setBreadcrumbPath(location.pathname); // Обновление хлебных крошек
        setDisplayedContent(outlet); // Обновление контента страницы
    };
    
    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Обработка изменения маршрута
    useEffect(() => {
        handleRouteChange();
    }, [location.pathname]);

    // Показ контента предыдущего маршрута, пока проверяются права доступа
    return (
        <>
            <Breadcrumbs path={breadcrumbPath} />
            <div className="page-content">{displayedContent}</div>
            <Breadcrumbs path={breadcrumbPath} />
        </>
    );
}
