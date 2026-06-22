import { useState, useRef, useEffect, createElement } from 'react';
import { useOutlet, matchPath } from 'react-router-dom';
import Breadcrumbs from '@/components/common/Breadcrumbs.jsx';
import { useAppSelector, useAppDispatch, useAppLocation } from '@/hooks/storeHooks.js';
import { routeConfig } from '@/config/appRouting.js';
import { checkAuth } from '@/services/authService.js';
import { setNavigationLock } from '@/redux/slices/uiSlice.js';
import { abortAllApiControllers } from '@/services/apiControllerService.js';
import { toError } from '@shared/commonHelpers.js';
import type { JSX, ReactNode } from 'react';

export default function ProtectedPageContent(): JSX.Element {
    const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);
    const [displayedContent, setDisplayedContent] = useState<ReactNode>(null);

    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();
    const location = useAppLocation();

    // Маршрут для хлебных крошек
    const [breadcrumbPath, setBreadcrumbPath] = useState(location.pathname);

    // Контент страницы вложенного маршрута (статичен). Если отсутствует - страница не найдена.
    const outlet = useOutlet() || createElement(routeConfig.notFound.component);

    /*const currentRoute = Object.values(routeConfig).find(route => 
        route.paths.some(pattern => matchPath(pattern, location.pathname))
    ) || routeConfig.notFound;*/

    const handleRouteChange = async (): Promise<void> => {
        abortAllApiControllers(); // Отмена API-запросов через контроллеры
        dispatch(setNavigationLock(true)); // Блокировка навигации

        try {
            // Проверка/обновление токена и импорт компонента страницы в кэш браузера (одновременно)
            await Promise.all([
                isAuthenticated ? dispatch(checkAuth()) : Promise.resolve(),
                //'importComponent' in currentRoute ? currentRoute.importComponent() : Promise.resolve()
            ]);
            if (isUnmountedRef.current) return;

            setBreadcrumbPath(location.pathname); // Обновление хлебных крошек
            setDisplayedContent(outlet); // Обновление контента страницы
        } catch (err) {
            console.error('Ошибка загрузки страницы:', toError(err).message);
        } finally {
            dispatch(setNavigationLock(false));
        }
    }
    
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
