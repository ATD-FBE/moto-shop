import './styles/global.scss';
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '@/hooks/storeHooks.js';
import { loadSession } from '@/services/authService.js';
import { routeConfig } from '@/config/appRouting.js';
import GlobalLoader from '@/components/GlobalLoader.jsx';
import Layout from '@/components/Layout.jsx';
import RouteGuard from '@/components/RouteGuard.jsx';
import AppStore from '@/redux/Store.js';
import StructureRefsProvider from '@/components/StructureRefsProvider.jsx';
import useDeviceInfo from '@/hooks/useDeviceInfo.js';
import type { JSX } from 'react';

const appRootElement = document.getElementById('app');

if (!appRootElement) {
    throw new Error('Не удалось найти корневой элемент "app". Проверьте index.html!');
}

const App = (): JSX.Element => {
    const isSessionReady = useAppSelector(state => state.ui.isSessionReady);
    const dispatch = useAppDispatch();

    useDeviceInfo();

    // Возобновление текущей сессии
    useEffect(() => {
        dispatch(loadSession());
    }, [dispatch]);

    return (
        <>
            <GlobalLoader visibility={!isSessionReady} />

            {isSessionReady && (
                <BrowserRouter>
                    <Routes>
                        <Route path='/' element={
                            <StructureRefsProvider>
                                <Layout />
                            </StructureRefsProvider>
                        }>
                            {Object.values(routeConfig).map(({ paths, access, component }, idx) =>
                                paths.map(path => (
                                    <Route
                                        key={`${idx}-${path}`}
                                        path={path}
                                        element={
                                            // Outlet для Layout
                                            <RouteGuard access={access} />
                                        }
                                    >
                                        // Outlet для ProtectedPageContent (вложенный маршрут)
                                        <Route index element={React.createElement(component)} />
                                    </Route>
                                ))
                            )}
                        </Route>
                    </Routes>
                </BrowserRouter>
            )}
        </>
        
    );
};

// BrowserRouter обёрнут снаружи App для работы useLocation
ReactDOM
    .createRoot(appRootElement)
    .render(
        <Provider store={AppStore}>
            <App />
        </Provider>
    );


    
/*Поток при рендере страницы:
Router → Layout → Outlet для Layout → RouteGuard → GlobalRedirect → ProtectedRoute →
ProtectedPageContent → Outlet для ProtectedPageContent → (контент страницы)*/
