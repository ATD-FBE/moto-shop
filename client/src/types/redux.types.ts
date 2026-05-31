import type AppStore from '@/redux/Store.js';
import type { ThunkAction, UnknownAction } from '@reduxjs/toolkit';
import type { Location, To } from 'react-router-dom';
import type { TScreenSize } from './config.types.js';
import type { IUser, IProduct, ICartItem } from '@shared/types/index.js';

////////////
/// MAIN ///
////////////

export type TAppThunk<TReturnValue = void> = ThunkAction<
    TReturnValue,
    TRootState,
    unknown,
    UnknownAction
>;

export type TAppDispatch = typeof AppStore.dispatch;
export type TRootState = ReturnType<typeof AppStore.getState>;

export interface TLocationState {
    from?: Location;
    newsId?: string;
    promoId?: string;
    notificationId?: string;
    isNotificationEditorExpanded?: boolean;
}

////////////////////
/// SLICE STATES ///
////////////////////

export interface IAuthState {
    isAuthenticated: boolean;
    isLocalSession: boolean;
    suppressAuthRedirect: boolean;
    forceRedirectToLogin: boolean;
    user: IUser | null;
    accessTokenExpiresAt: number;
    refreshTokenExpiresAt: number;
}

export interface IUiState {
    isTouchDevice: boolean;
    screenSize: TScreenSize;
    isDashboardPanelActive: boolean;
    isNavigationLocked: boolean;
    lockedRoute: ILockedRoute | null;
    isSessionReady: boolean;
    newNotificationsCount: number;
    newActiveOrdersCount: number;
}
interface ILockedRoute {
    path: To;
    cancelPath: To | null;
    isCancelFreeze: boolean;
}

export interface ILoadingState {
    activeApiRequests: number;
    activeMediaRequests: number;
}

export interface IAlertModalState {
    isOpen: boolean;
    type?: 'info' | 'warn' | 'error';
    dismissible?: boolean;
    title?: string;
    message?: string;
    dismissBtnLabel?: string;
}

export interface IConfirmModalState {
    isOpen: boolean;
    openDelay?: number;
    dismissible?: boolean;
    prompt?: string;
    confirmBtnLabel?: string;
    cancelBtnLabel?: string;
}

export interface IImageViewerModalState {
    isOpen: boolean;
    images: { url: string, title: string }[];
    initialIndex: number;
}

export interface IProductsState {
    byId: Record<string, IProduct>;
    ids: string[];
}

export interface ICartState {
    byId: Record<string, ICartItem>;
    ids: string[];
    rawTotal: number;
    discountedTotal: number;
    isAccessible: boolean;
}
