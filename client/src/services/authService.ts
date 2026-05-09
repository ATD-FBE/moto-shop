import AppStore from '@/redux/Store.js';
import {
    sendAuthSessionRequest,
    sendAuthRefreshRequest,
    sendAuthLogoutRequest
} from '@/api/authRequests.js';
import { login, logout, setAccessTokenExpiry } from '@/redux/slices/authSlice.js';
import { removePrivilegedFieldsFromProducts } from '@/redux/slices/productsSlice.js';
import { setCartAccessibility, setCart, clearCart } from '@/redux/slices/cartSlice.js';
import { setLockedRoute, clearLockedRoute, setSessionReady } from '@/redux/slices/uiSlice.js';
import { routeConfig } from '@/config/appRouting.js';
import { ACCESS_TOKEN_BUFFER, REFRESH_TOKEN_BUFFER } from '@/config/constants.js';
import { syncGuestCart } from '@/services/guestCartService.js';
import { refreshCartTotals, applyCartState } from '@/services/cartService.js';
import {
    prepareGuestCartPayload,
    loadGuestCartFromLocalStorage,
    removeGuestCartFromLocalStorage
} from '@/services/guestCartService.js';
import { openAlertModal } from '@/services/modalAlertService.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import { toError } from '@shared/commonHelpers.js';
import { USER_ROLE, REQUEST_STATUS } from '@shared/constants.js';
import type { TAppThunk, IOpenAlertModalParams } from '@/types/index.js';
import type { IUser, IProduct, ICartItem } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IInitCustomerSessionParams {
    tradeProductList?: IProduct[];
    cartItemList?: ICartItem[];
    customerDiscount?: number;
    orderDraftId?: string | null;
    cartWasMerged?: boolean;
    isFirstLogin?: boolean;
}

interface IInitCustomerSessionResult {
    redirectTo: string | null;
}

interface IHandleLogoutParams {
    forceRedirectToLogin?: boolean;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export const saveUserToLocalStorage = (user: IUser | null): void => {
    if (!user) return;
    localStorage.setItem('user', JSON.stringify(user));
};

export const removeUserFromLocalStorage = (): void => {
    localStorage.removeItem('user');
};

export const loadSession = (): TAppThunk<Promise<void>> =>
    async (dispatch) => {
        const localUserData = localStorage.getItem('user');
        
        // Нет локальных данных пользователя => загрузка и синхронизация гостевой корзины
        if (!localUserData) {
            await dispatch(syncGuestCart());
            dispatch(setSessionReady(true));
            return;
        }

        // Запрос данных сессии пользователя
        const guestCart = prepareGuestCartPayload();
        const responseData = await dispatch(sendAuthSessionRequest({ guestCart }));
        const { status, message } = responseData;

        logRequestStatus({ context: 'AUTH: SESSION', status, message });

        if (status === REQUEST_STATUS.SUCCESS) {
            const {
                user, accessTokenExp, refreshTokenExp,
                tradeProductList, cartItemList, cartWasMerged, orderDraftId
            } = responseData;

            dispatch(login({ user, accessTokenExp, refreshTokenExp }));

            if (user.role === USER_ROLE.CUSTOMER) {
                // При восстановлении сессии для orderDraftId срабатывает глобальный редирект
                dispatch(initCustomerSession({
                    tradeProductList,
                    cartItemList,
                    customerDiscount: user.discount,
                    orderDraftId,
                    cartWasMerged
                }));
            }

            dispatch(setSessionReady(true));
            return;
        }

        // Токены не валидны или пользователь не найден => разлогинивание и выход
        if (status === REQUEST_STATUS.UNAUTH || status === REQUEST_STATUS.USER_GONE) {
            dispatch(setSessionReady(true));
            return;
        }

        // Нет соединения или ошибка сервера => загрузка локальных данных пользователя
        try {
            const localUser = JSON.parse(localUserData);

            if (!isValidUser(localUser)) {
                throw new Error('Структура данных не соответствует их типу');
            }

            logRequestStatus({
                context: 'AUTH: LOCAL USER',
                status: REQUEST_STATUS.SUCCESS,
                message: 'Загружены локальные данные пользователя'
            });

            dispatch(login({ isLocalSession: true, user: localUser }));
            dispatch(setCartAccessibility(false)); // Блокировака корзины

            delayAndShowAlert({
                type: 'error',
                dismissible: false,
                title: 'Ошибка сервера...',
                message:
                    'Загружены локальные данные пользователя.\n' +
                    'Добавление товаров, работа с корзиной и все функции, требующие авторизации, ' +
                    'временно недоступны.'
            });
        } catch (err) {
            console.error('Ошибка при парсинге локальных данных пользователя:', toError(err));
            dispatch(logout(false)); // Разлогинивание при ошибке парсинга локальных данных
        }

        dispatch(setSessionReady(true));
    };

export const initCustomerSession = ({
    tradeProductList = [],
    cartItemList = [],
    customerDiscount = 0,
    orderDraftId = null,
    cartWasMerged = false,
    isFirstLogin = false
}: IInitCustomerSessionParams): TAppThunk<IInitCustomerSessionResult> =>
    (dispatch) => {
        removeGuestCartFromLocalStorage();
        
        dispatch(applyCartState(tradeProductList, cartItemList, customerDiscount));

        let redirectTo: string | null = null;

        if (orderDraftId) {
            const checkoutPath = routeConfig.customerCheckout.generatePath({ orderId: orderDraftId });
            redirectTo = checkoutPath;
            dispatch(setLockedRoute(checkoutPath));
        }
        
        if (cartWasMerged) {
            delayAndShowAlert({
                type: 'info',
                title: 'Обновление корзины товаров',
                message: 'Товары из гостевой корзины перенесены в корзину аккаунта.' +
                    (!isFirstLogin
                        ? ' При совпадении товаров использовано количество из гостевой версии.'
                        : '')
            });
        }

        return { redirectTo };
    };

export const checkAuth = (): TAppThunk<Promise<void>> =>
    async (dispatch, getState) => {
        const { isLocalSession, accessTokenExpiresAt, refreshTokenExpiresAt } = getState().auth;
        if (isLocalSession) return;

        const now = Date.now();

        // Проверка access token
        const isAccessTokenValid = now + ACCESS_TOKEN_BUFFER < accessTokenExpiresAt;
        if (isAccessTokenValid) return;

        // Access token просрочен — проверка refresh token
        const isRefreshTokenValid = now + REFRESH_TOKEN_BUFFER < refreshTokenExpiresAt;
        if (!isRefreshTokenValid) return await dispatch(handleLogout());

        // Refresh token валиден — обновление access token
        const responseData = await dispatch(sendAuthRefreshRequest());
        const { status, message } = responseData;

        logRequestStatus({ context: 'AUTH: ROUTE REFRESH', status, message });

        if (status === REQUEST_STATUS.SUCCESS) {
            dispatch(setAccessTokenExpiry(responseData.accessTokenExp));
        } else if (status === REQUEST_STATUS.UNAUTH) {
            await dispatch(handleLogout());
        }
    };

export const handleLogout = (
    { forceRedirectToLogin = false }: IHandleLogoutParams = {}
): TAppThunk<Promise<void>> =>
    async (dispatch, getState) => {
        const userRole = getState().auth.user?.role ?? 'guest';
        const isPrivilegedUser = userRole === USER_ROLE.ADMIN;
        
        // Запрос на удаление токенов, выход даже при ошибке
        const { status, message } = await dispatch(sendAuthLogoutRequest());
        logRequestStatus({ context: 'AUTH: LOGOUT', status, message });
        
        // Удаление данных пользователя
        removeUserFromLocalStorage();

        // Разлогинивание
        dispatch(logout(forceRedirectToLogin));

        // Очистка критических данных товаров в Redux при выходе привиллегированного пользователя
        if (isPrivilegedUser) dispatch(removePrivilegedFieldsFromProducts());

        // Установка гостевой корзины при выходе админа или очистка корзины при выходе покупателя
        const guestCart = loadGuestCartFromLocalStorage();

        if (guestCart.length > 0) {
            dispatch(setCart(guestCart));
            dispatch(refreshCartTotals());
        } else {
            dispatch(clearCart());
        }

        // Восстановление доступности корзины
        dispatch(setCartAccessibility(true));

        // Очистка глобального заблокированного маршрута
        dispatch(clearLockedRoute());

        // Сигнал для выхода со всех вкладок браузера
        localStorage.setItem('auth:logout', String(Date.now()));
    };

const isValidUser = (data: any): data is IUser => {
    return data && typeof data === 'object' && 'id' in data && 'email' in data && 'role' in data;
};

const delayAndShowAlert = (alertOptions: IOpenAlertModalParams, delay = 1000) => {
    setTimeout(() => {
        const isAuthenticated = AppStore.getState().auth.isAuthenticated;
        if (isAuthenticated) openAlertModal(alertOptions);
    }, delay);
};
