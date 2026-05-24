import type {
    TEmptyResponse,
    TAuthErrorResponse,
    TFieldErrorResponse,
    TGeneralErrorResponse,
    TSuccessResponse
} from './apiResponse.types.js';
import type { IGuestCartItem, ICartItem } from './cart.types.js';
import type { IProduct } from './product.types.js';
import type {
    TRegisteredUserRole,
    TFieldErrors,
    TEntityField,
    TDeliveryMethod,
    TPaymentMethod
} from './shared.types.js';
import type { ICheckoutDetails } from './checkout.types.js';

////////////
/// MAIN ///
////////////

export interface IUser {
    name: string;
    email: string;
    role: TRegisteredUserRole;
    discount?: number;
    unreadNotificationsCount?: number;
    activeOrdersCount?: number;
}

export interface ISession {
    user: IUser;
    tradeProductList?: IProduct[];
    cartItemList?: ICartItem[];
    cartWasMerged?: boolean;
    orderDraftId?: string | null;
}

////////////////
/// REQUESTS ///
////////////////

type TAuthBaseSuccessData = ISession & {
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
    | TFieldErrorResponse<'auth'>
    | TGeneralErrorResponse
    | TSuccessResponse<TAuthBaseSuccessData>;

/// Авторизация ///
export interface IAuthLoginBody {
    formFields: {
        name: string;
        password: string;
        rememberMe: boolean;
    };
    guestCart: IGuestCartItem[];
}

export type TAuthLoginResponse =
    | TLoginAuthError
    | TFieldErrorResponse<'auth'>
    | TGeneralErrorResponse
    | TSuccessResponse<TAuthBaseSuccessData>;

type TLoginAuthError = TAuthErrorResponse & { fieldErrors: TFieldErrors<'auth'> };

/// Изменение данных пользователя ///
export interface IAuthUserUpdateBody {
    newName?: string;
    newEmail?: string;
    currentPassword?: string;
    newPassword?: string;
}

export type TAuthUserUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TFieldErrorResponse<'auth'>
    | TGeneralErrorResponse
    | TSuccessResponse<IAuthUserUpdateSuccessData>;

interface IAuthUserUpdateSuccessData {
    fieldErrors?: TFieldErrors<'auth'>;
    updatedFormFields: TEntityField<'auth'>[];
    updatedUser: IUser;
}

/// Загрузка данных сессии пользователя ///
export interface IAuthSessionBody {
    guestCart: IGuestCartItem[];
}

export type TAuthSessionResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<TAuthBaseSuccessData>;

/// Обновление токена доступа ///
export type TAuthRefreshResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<IAuthRefreshSuccessData>;

interface IAuthRefreshSuccessData {
    accessTokenExp: number;
}

/// Загрузка настроек заказа ///
export type TAuthCheckoutPrefsResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<IAuthCheckoutPrefsSuccessData>;

interface IAuthCheckoutPrefsSuccessData {
    checkoutPrefs?: ICheckoutDetails;
}

/// Изменение настроек заказа ///
export interface IAuthCheckoutPrefsUpdateBody {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    email?: string;
    phone?: string;
    deliveryMethod?: TDeliveryMethod;
    allowCourierExtra?: boolean;
    region?: string;
    district?: string;
    city?: string;
    street?: string;
    house?: string;
    apartment?: string;
    postalCode?: string;
    defaultPaymentMethod?: TPaymentMethod;
}

export type TAuthCheckoutPrefsUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TFieldErrorResponse<'checkout'>
    | TGeneralErrorResponse
    | TSuccessResponse;

/// Выход из сессии ///
export type TAuthLogoutResponse =
    | TGeneralErrorResponse
    | TSuccessResponse;
