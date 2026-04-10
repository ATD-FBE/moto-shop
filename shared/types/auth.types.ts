import type {
    TEmptyResponse,
    TAuthErrorResponse,
    TValidationErrorResponse,
    TCommonErrorResponse,
    TSuccessResponse
} from './apiResponse.types.js';
import type { IGuestCartItem, ICartItem } from './cart.types.js';
import type { IProduct, IProductSnapshot } from './product.types.js';
import type { TActiveUserRole, TFieldErrors, TEntityField } from './shared.types.js';
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
export type TAuthSuccessData = ISession & {
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
    | TValidationErrorResponse<'auth'>
    | TCommonErrorResponse
    | TSuccessResponse<TAuthSuccessData>;

/// Авторизация ///
export interface IAuthLoginBody {
    formFields: {
        name: string;
        password: string;
        rememberMe: boolean;
    };
    guestCart: IGuestCartItem[];
}

type TLoginAuthError = TAuthErrorResponse & { fieldErrors: TFieldErrors<'auth'> };
export type TAuthLoginResponse =
    | TLoginAuthError
    | TValidationErrorResponse<'auth'>
    | TCommonErrorResponse
    | TSuccessResponse<TAuthSuccessData>;

/// Изменение данных пользователя ///
export interface IAuthUserUpdateBody {
    newName?: string;
    newEmail?: string;
    currentPassword?: string;
    newPassword?: string;
}

interface IAuthUserUpdateSuccessData {
    fieldErrors?: TFieldErrors<'auth'>;
    updatedFormFields: TEntityField<'auth'>[];
    updatedUser: IUser;
}
export type TAuthUserUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TValidationErrorResponse<'auth'>
    | TCommonErrorResponse
    | TSuccessResponse<IAuthUserUpdateSuccessData>;

/// Загрузка данных сессии пользователя ///
export interface IAuthSessionBody {
    guestCart: IGuestCartItem[];
}

export type TAuthSessionResponse =
    | TCommonErrorResponse
    | TSuccessResponse<TAuthSuccessData>;

/// Обновление токена доступа ///
interface IAuthRefreshSuccessData {
    accessTokenExp: number;
}
export type TAuthRefreshResponse =
    | TAuthErrorResponse
    | TCommonErrorResponse
    | TSuccessResponse<IAuthRefreshSuccessData>;

/// Загрузка настроек заказа ///
interface IAuthCheckoutPrefsSuccessData {
    checkoutPrefs?: TDbUser['checkoutPrefs'];
}
export type TAuthCheckoutPrefsResponse =
    | TAuthErrorResponse
    | TCommonErrorResponse
    | TSuccessResponse<IAuthCheckoutPrefsSuccessData>;

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
    | TEmptyResponse
    | TAuthErrorResponse
    | TValidationErrorResponse<'checkout'>
    | TCommonErrorResponse
    | TSuccessResponse;

/// Выход из сессии ///
export type TAuthLogoutResponse =
    | TCommonErrorResponse
    | TSuccessResponse;
