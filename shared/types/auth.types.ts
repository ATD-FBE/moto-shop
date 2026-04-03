import type { IGuestCartItem } from '@shared/types/index.js';

export interface IAuthRegistrationBody {
    formFields: {
        name: string;
        email: string;
        password: string;
        adminRegCode?: string;
    };
    guestCart: IGuestCartItem[];
}

export interface IAuthLoginBody {
    formFields: {
        name: string;
        password: string;
        rememberMe: boolean;
    };
    guestCart: IGuestCartItem[];
}
