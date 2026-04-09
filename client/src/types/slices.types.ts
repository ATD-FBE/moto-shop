import type { IUser } from '@shared/types/index.js'; 

//////////////////
/// AUTH SLICE ///
//////////////////

export interface IAuthState {
    isAuthenticated: boolean;
    isLocalSession: boolean;
    suppressAuthRedirect: boolean;
    forceRedirectToLogin: boolean;
    user: IUser | null;
    accessTokenExpiresAt: number;
    refreshTokenExpiresAt: number;
}

export interface IAuthLoginPayload {
    user: IUser;
    isLocalSession?: boolean;
    suppressAuthRedirect?: boolean;
    accessTokenExp?: number;
    refreshTokenExp?: number;
}
