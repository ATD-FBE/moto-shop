import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { IAuthState, IAuthLoginPayload } from '@/types/index.js';
import type { IUser } from '@shared/types/index.js';

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

        adjustUnreadNotificationsCount: (state, action: PayloadAction<number>) => {
            if (!state.user) return;

            const newCount = action.payload ?? 0;
            if (!newCount) return;

            const oldCount = state.user.unreadNotificationsCount ?? 0;
            state.user.unreadNotificationsCount = Math.max(0, oldCount + newCount);
        },

        adjustManagedActiveOrdersCount: (state, action: PayloadAction<number>) => {
            if (!state.user) return;

            const newCount = action.payload ?? 0;
            if (!newCount) return;

            const oldCount = state.user.managedActiveOrdersCount ?? 0;
            state.user.managedActiveOrdersCount = Math.max(0, oldCount + newCount);
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
    adjustUnreadNotificationsCount,
    adjustManagedActiveOrdersCount
} = authSlice.actions;

export default authSlice.reducer;
