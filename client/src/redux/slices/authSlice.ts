import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { IUser } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

export interface IAuthState {
    isAuthenticated: boolean;
    isLocalSession: boolean;
    suppressAuthRedirect: boolean;
    forceRedirectToLogin: boolean;
    user: IUser | null;
    accessTokenExpiresAt: number;
    refreshTokenExpiresAt: number;
}

interface IAuthLoginPayload {
    user: IUser;
    isLocalSession?: boolean;
    suppressAuthRedirect?: boolean;
    accessTokenExp?: number;
    refreshTokenExp?: number;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const initialState: IAuthState = {
    isAuthenticated: false,
    isLocalSession: false,
    suppressAuthRedirect: false,
    forceRedirectToLogin: false,
    user: null,
    accessTokenExpiresAt: 0,
    refreshTokenExpiresAt: 0
};

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        login: (state, action: PayloadAction<IAuthLoginPayload>) => {
            const {
                isLocalSession = false,
                suppressAuthRedirect = false,
                user,
                accessTokenExp = 0,
                refreshTokenExp = 0
            } = action.payload;
            
            state.isAuthenticated = true;
            state.isLocalSession = isLocalSession;
            state.suppressAuthRedirect = suppressAuthRedirect;
            state.forceRedirectToLogin = false;
            state.user = user;
            state.accessTokenExpiresAt = accessTokenExp;
            state.refreshTokenExpiresAt = refreshTokenExp;
        },

        logout: (_state, action: PayloadAction<boolean>) => ({
            ...initialState,
            forceRedirectToLogin: action.payload
        }),

        updateUser: (state, action: PayloadAction<IUser>) => {
            state.user = action.payload;
        },

        updateCustomerDiscount: (state, action: PayloadAction<number>) => {
            if (!state.user) return;
            state.user.discount = action.payload;
        },

        setAccessTokenExpiry(state, action: PayloadAction<number>) {
            state.accessTokenExpiresAt = action.payload;
        },

        resetSuppressAuthRedirect: (state) => {
            state.suppressAuthRedirect = false;
        },

        adjustUnreadNotifications: (state, action: PayloadAction<number>) => {
            if (!state.user) return;

            const change = action.payload;
            if (!change) return;

            const currentCount = state.user.unreadNotificationsCount ?? 0;
            state.user.unreadNotificationsCount = Math.max(0, currentCount + change);
        },

        adjustActiveOrders: (state, action: PayloadAction<number>) => {
            if (!state.user) return;

            const change = action.payload;
            if (!change) return;

            const currentCount = state.user.activeOrdersCount ?? 0;
            state.user.activeOrdersCount = Math.max(0, currentCount + change);
        }
    }
});

export const {
    login,
    logout,
    updateUser,
    updateCustomerDiscount,
    setAccessTokenExpiry,
    resetSuppressAuthRedirect,
    adjustUnreadNotifications,
    adjustActiveOrders
} = authSlice.actions;

export default authSlice.reducer;
