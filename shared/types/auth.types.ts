import type {
    IEmptyResponse,
    IBaseResponse,
    IAuthErrorResponse,
    IValidationErrorResponse,
    IErrorResponse,
    TSuccessResponse,
} from './api.types.js';
import type { IGuestCartItem, ICartItem } from './cart.types.js';
import type { IProduct, IProductSnapshot } from './product.types.js';
import type { TActiveUserRole } from './constants.types.js';
import type { TFieldErrors } from './fieldRules.types.js';
import type { TDbUser } from '@server/types/index.js';

/// Общие типы ///
export interface IUser {
    name: string;
    email: string;
    role: TActiveUserRole;
    unreadNotificationsCount?: number;
    discount?: number;
    managedActiveOrdersCount?: number;
}
export interface ISession {
    user: IUser;
    purchaseProductList?: (IProduct | IProductSnapshot)[];
    cartItemList?: ICartItem[];
    cartWasMerged?: boolean;
    orderDraftId?: string | null;
}
type TAuthSuccessData = ISession & {
    accessTokenExp: number;
    refreshTokenExp: number;
};

/// Регистрация ///
export interface IAuthRegistrationBody {
    formFields: {
        name: string;
        email: string;
        password: string;
        adminRegCode?: string;
    };
    guestCart: IGuestCartItem[];
}

export type TAuthRegistrationResponse = 
    | TSuccessResponse<TAuthSuccessData>
    | IValidationErrorResponse<'auth'>
    | IErrorResponse;

/// Авторизация ///
export interface IAuthLoginBody {
    formFields: {
        name: string;
        password: string;
        rememberMe: boolean;
    };
    guestCart: IGuestCartItem[];
}

type TLoginAuthError = IAuthErrorResponse & { fieldErrors: TFieldErrors<'auth'> };
export type TAuthLoginResponse = 
    | TSuccessResponse<TAuthSuccessData>
    | TLoginAuthError
    | IValidationErrorResponse<'auth'>
    | IErrorResponse;

/// Изменение данных пользователя ///
export interface IAuthUserUpdateBody {
    newName?: string;
    newEmail?: string;
    currentPassword?: string;
    newPassword?: string;
}

export type TAuthUserUpdateResponse = 
    | TSuccessResponse<TAuthSuccessData>
    | IValidationErrorResponse<'auth'>
    | IErrorResponse
    | IEmptyResponse;

/// Загрузка данных сессии пользователя ///
export interface IAuthSessionBody {
    guestCart: IGuestCartItem[];
}

export type TAuthSessionResponse = 
    | TSuccessResponse<TAuthSuccessData>
    | IErrorResponse;

/// Обновление токена доступа ///
interface IAuthRefreshSuccessData {
    accessTokenExp: number;
}
export type TAuthRefreshResponse =
    | TSuccessResponse<IAuthRefreshSuccessData>
    | IAuthErrorResponse
    | IErrorResponse;

/// Загрузка настроек заказа ///
interface IAuthCheckoutPrefsSuccessData {
    checkoutPrefs?: TDbUser['checkoutPrefs'];
}
export type TAuthCheckoutPrefsResponse =
    | TSuccessResponse<IAuthCheckoutPrefsSuccessData>
    | IErrorResponse;

/// Изменение настроек заказа ///
export interface IAuthCheckoutPrefsUpdateBody {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    email?: string;
    phone?: string;
    deliveryMethod?: string;
    allowCourierExtra?: boolean;
    region?: string;
    district?: string;
    city?: string;
    street?: string;
    house?: string;
    apartment?: string;
    postalCode?: string;
    defaultPaymentMethod?: string;
}

export type TAuthCheckoutPrefsUpdateResponse =
    | IBaseResponse
    | IValidationErrorResponse<'checkout'>
    | IErrorResponse
    | IEmptyResponse;

/// Выход из сессии ///
export type TAuthLogoutResponse =
    | IBaseResponse
    | IErrorResponse;
