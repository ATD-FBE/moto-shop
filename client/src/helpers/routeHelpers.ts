import { routeConfig } from '@/config/appRouting.js';
import { AUTH_NAV_TYPE } from '@/config/constants.js';
import { REGISTERED_USER_ROLES, USER_ROLE } from '@shared/constants.js';
import type { TRouteConfig, TRoute, TRoutePath, INavItem, IBreadcrumb } from '@/types/index.js';

export const buildNavigationMap = () => {
    const navigationMap: Record<string, INavItem[]> = {};

    // Создание элемента меню навигации
    const buildNavItem = (route: TRoute): INavItem => {
        const { label, paths } = route;
        const navItem: INavItem = { label, paths };
        
        if ('nav' in route) {
            const nav = route.nav;
            
            if ('order' in nav) navItem.order = nav.order;
            if ('authType' in nav) navItem.authType = nav.authType;
            if ('featured' in nav) navItem.featured = nav.featured;
            if ('badge' in nav) navItem.badge = nav.badge;
        }
    
        return navItem;
    };

    // Рекурсивная функция для сборки потомков без мутаций
    const buildNavChildren = (childKeys: readonly (keyof TRouteConfig)[]): INavItem[] =>
        childKeys
            .map(key => {
                const childRoute = routeConfig[key];
                if (!childRoute) {
                    console.warn(`Маршрут "${key}" не найден в конфиге маршрутов`);
                    return null;
                }

                const childNavItem = buildNavItem(childRoute);
                const children = 'nav' in childRoute && 'children' in childRoute.nav
                    ? childRoute.nav?.children
                    : undefined;

                if (children) {
                    childNavItem.children = buildNavChildren(children);
                }

                return childNavItem;
            })
            .filter((item: INavItem | null): item is INavItem => Boolean(item));

    // Основная функция сборки navigationMap
    const populateNavigationMap = () => {
        Object.values(routeConfig).forEach(route => {
            if (!('nav' in route)) return;

            const { nav } = route;
            const { map, order } = nav;
            if (map === undefined || order === undefined) return;
    
            const topNavItem = buildNavItem(route);
    
            if ('children' in nav) {
                topNavItem.children = buildNavChildren(nav.children);
            }
    
            navigationMap[map] ??= [];
            navigationMap[map].push(topNavItem);
        });
    };

    // Сортировка пунктов каждого меню по order
    const sortNavigationItems = (): void => {
        Object.values(navigationMap).forEach(items => {
            items.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
        });
    };

    // Функция расширения карт меню авторизации
    const buildAuthNavSections = (): void => {
        const USER_ROLES = [USER_ROLE.GUEST, ...REGISTERED_USER_ROLES];

        USER_ROLES.forEach(userRole => {
            if (userRole === USER_ROLE.GUEST) {
                navigationMap[`${userRole}Auth`] = navigationMap[`${userRole}Auth`] || [];
            } else {
                navigationMap[`${userRole}Auth`] = [
                    {
                        authType: AUTH_NAV_TYPE.USER_LABEL,
                        label: 'Вы вошли как',
                        paths: routeConfig[`${userRole}Profile`].paths,
                        order: 0
                    },
                    {
                        authType: AUTH_NAV_TYPE.LOGOUT,
                        label: 'Выйти',
                        order: 1
                    }
                ];
            }
        });
    };
           
    // Сборка и финализация карты навигации
    populateNavigationMap();
    sortNavigationItems();
    buildAuthNavSections();

    return navigationMap;
};

export const buildBreadcrumbMap = (): Record<TRoutePath, IBreadcrumb> => {
    return Object.values(routeConfig).reduce((acc, route) => {
        route.paths.forEach(path => {
            acc[path] = {
                label: route.label,
                parentPath: 'parent' in route ? routeConfig[route.parent].paths[0] : null,
                ...('generatePath' in route && { generatePath: route.generatePath }),
                ...('paramSchema' in route && { paramSchema: route.paramSchema })
            };
        });

        return acc;
    }, {} as Record<TRoutePath, IBreadcrumb>);
};

interface IParamSchema {
    split: string;
    map: string[];
}

export const parseRouteParams = (
    { routeKey, params }: { routeKey: keyof TRouteConfig, params: Record<string, string | undefined> }
): Record<string, string | undefined> => {
    const result: Record<string, string | undefined> = {};
    const route = routeConfig[routeKey];
    if (!route || !('paramSchema' in route)) return result;

    const paramSchemaEntries = Object.entries(route.paramSchema) as [string, IParamSchema][];

    for (const [paramName, schema] of paramSchemaEntries) {
        const rawValue = params[paramName];
        if (rawValue == null) continue;

        // Простой параметр без схемы
        if (!schema.split || !schema.map) {
            result[paramName] = rawValue;
            continue;
        }

        // Сбор значений параметров по схеме
        const parts = rawValue.split(schema.split);

        schema.map.forEach((key, idx) => {
            result[key] = parts[idx];
        });
    }

    return result;
};
