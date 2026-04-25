import type {
    TEmptyResponse,
    TAuthErrorResponse,
    TFormFieldsErrorResponse,
    TGeneralErrorResponse,
    TSuccessResponse
} from './apiResponse.types.js';
import type { IGuestCartItem, ICartItem } from './cart.types.js';
import type { TPurchaseProduct } from './product.types.js';
import type {
    TRegisteredUserRole,
    TFieldErrors,
    TEntityField,
    TDeliveryMethod,
    TPaymentMethod
} from './shared.types.js';
import type { TDbUser } from '@server/types/index.js';

/// Общие типы ///
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
    purchaseProductList?: TPurchaseProduct[];
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
    | TFormFieldsErrorResponse<'auth'>
    | TGeneralErrorResponse
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
    | TFormFieldsErrorResponse<'auth'>
    | TGeneralErrorResponse
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
    | TFormFieldsErrorResponse<'auth'>
    | TGeneralErrorResponse
    | TSuccessResponse<IAuthUserUpdateSuccessData>;

/// Загрузка данных сессии пользователя ///
export interface IAuthSessionBody {
    guestCart: IGuestCartItem[];
}

export type TAuthSessionResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<TAuthSuccessData>;

/// Обновление токена доступа ///
interface IAuthRefreshSuccessData {
    accessTokenExp: number;
}
export type TAuthRefreshResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<IAuthRefreshSuccessData>;

/// Загрузка настроек заказа ///
interface IAuthCheckoutPrefsSuccessData {
    checkoutPrefs?: TDbUser['checkoutPrefs'];
}
export type TAuthCheckoutPrefsResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<IAuthCheckoutPrefsSuccessData>;

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
    | TFormFieldsErrorResponse<'checkout'>
    | TGeneralErrorResponse
    | TSuccessResponse;

/// Выход из сессии ///
export type TAuthLogoutResponse =
    | TGeneralErrorResponse
    | TSuccessResponse;
