import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { To } from 'react-router-dom';
import type { IUiState } from '@/types/index.js';
import type { TScreenSize } from '@/types/index.js';

const initialState: IUiState = {
    isTouchDevice: false,
    screenSize: null,
    isDashboardPanelActive: false,
    isNavigationLocked: false,
    lockedRoute: null,
    isSessionReady: false,
    newNotificationsCount: 0,
    newActiveOrdersCount: 0
};

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        markAsTouchDevice: (state, action: PayloadAction<boolean>) => {
            state.isTouchDevice = action.payload;
        },

        setScreenSize: (state, action: PayloadAction<TScreenSize>) => {
            state.screenSize = action.payload;
        },

        setDashboardPanelActivity(state, action: PayloadAction<boolean>) {
            state.isDashboardPanelActive = action.payload;
        },

        setNavigationLock: (state, action: PayloadAction<boolean>) => {
            state.isNavigationLocked = action.payload;
        },

        setLockedRoute: (state, action: PayloadAction<To>) => {
            state.lockedRoute = { path: action.payload, cancelPath: null, isCancelFreeze: false };
            state.isNavigationLocked = true;
        },

        setLockedRouteCancelPath: (state, action: PayloadAction<To | null>) => {
            if (state.lockedRoute) state.lockedRoute.cancelPath = action.payload;
        },

        freezeLockedRouteCancel(state) { // Нельзя изменить cancel-маршрут после заморозки состояния
            if (state.lockedRoute) state.lockedRoute.isCancelFreeze = true;
        },

        clearLockedRoute: (state) => {
            state.lockedRoute = null;
            state.isNavigationLocked = false;
        },

        setSessionReady: (state, action: PayloadAction<boolean>) => {
            state.isSessionReady = action.payload;
        },

        incrementNewNotifications: (state, action: PayloadAction<number>) => {
            state.newNotificationsCount += Math.max(0, action.payload);
        },

        resetNewNotifications: (state) => {
            state.newNotificationsCount = 0;
        },

        incrementNewActiveOrders: (state, action: PayloadAction<number>) => {
            state.newActiveOrdersCount += Math.max(0, action.payload);
        },

        resetNewActiveOrders: (state) => {
            state.newActiveOrdersCount = 0;
        }
    }
});

export const {
    markAsTouchDevice,
    setScreenSize,
    setDashboardPanelActivity,
    setNavigationLock,
    setLockedRoute,
    setLockedRouteCancelPath,
    freezeLockedRouteCancel,
    clearLockedRoute,
    setSessionReady,
    incrementNewNotifications,
    resetNewNotifications,
    incrementNewActiveOrders,
    resetNewActiveOrders
} = uiSlice.actions;

export default uiSlice.reducer;
