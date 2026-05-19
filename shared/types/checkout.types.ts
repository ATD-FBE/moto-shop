import type {
    TEmptyResponse,
    TAuthErrorResponse,
    TFieldErrorResponse,
    TLimitationErrorResponse,
    TModifiedErrorResponse,
    TGeneralErrorResponse,
    TSuccessResponse
} from './apiResponse.types.js';
import type { ICartItem } from './cart.types.js';
import type { IProduct, IProductAdjustment } from './product.types.js';
import type {
    ICustomerInfo,
    IDelivery,
    IFinancials,
    IOrderTotals
} from './order.types.js';
import { TDiscountSource, TDeliveryMethod, TPaymentMethod } from './shared.types.js';

/// Общие типы ///
export interface ICheckoutDetails {
    customerInfo?: Partial<Pick<ICustomerInfo,
        | 'firstName'
        | 'lastName'
        | 'middleName'
        | 'email'
        | 'phone'
    >>;
    delivery?: {
        deliveryMethod?: IDelivery['deliveryMethod'];
        allowCourierExtra?: IDelivery['allowCourierExtra'];
        shippingAddress?: Partial<IDelivery['shippingAddress']>;
    };
    financials?: {
        defaultPaymentMethod?: IFinancials['defaultPaymentMethod'];
    };
};

export interface IOrderDraft extends ICheckoutDetails {
    expiresAt: Date;
    items: {
        productId: string;
        quantity: number;
        priceSnapshot: number;
        appliedDiscountSnapshot: number;
    }[];
    totals: IOrderTotals;
    customerComment?: string;
}

export interface IInitialOrderItemSnapshot {
    productId: string;
    priceSnapshot: number;
    appliedDiscountSnapshot: number;
    appliedDiscountSourceSnapshot: TDiscountSource;
}

interface ICheckoutBaseResponseData {
    tradeProductList: IProduct[];
    cartItemList: ICartItem[];
    customerDiscount: number;
}

/// Синхронизация и загрузка черновика заказа ///
export type TOrderDraftSyncResponse =
    | TAuthErrorResponse
    | TLimitationErrorResponse<IOrderDraftSyncLimitationErrorData>
    | TGeneralErrorResponse
    | TSuccessResponse<IOrderDraftSyncSuccessData>;

interface IOrderDraftSyncLimitationErrorData extends ICheckoutBaseResponseData {
    orderDraft: Pick<IOrderDraft, 'items' | 'totals'>;
    orderItemAdjustments: IProductAdjustment[];
}
interface IOrderDraftSyncSuccessData extends ICheckoutBaseResponseData {
    orderDraft: IOrderDraft;
    orderItemAdjustments: IProductAdjustment[];
}

/// Создание черновика заказа ///
export interface IOrderDraftCreateBody {
    initialOrderItemSnapshots: IInitialOrderItemSnapshot[];
}

export type TOrderDraftCreateResponse =
    | TAuthErrorResponse
    | TLimitationErrorResponse<IOrderDraftCreateLimitationErrorData>
    | TGeneralErrorResponse
    | TSuccessResponse<IOrderDraftCreateSuccessData>;

interface IOrderDraftCreateLimitationErrorData extends ICheckoutBaseResponseData {
    currentTotal: number;
    cartItemAdjustments: IProductAdjustment[];
}
interface IOrderDraftCreateSuccessData extends ICheckoutBaseResponseData {
    orderId: string;
    cartItemAdjustments: IProductAdjustment[];
}

/// Изменение черновика заказа ///
export interface IOrderDraftUpdateBody {
    firstName?: string;
    lastName?: string;
    middleName?: string;
    email?: string;
    phone?: string;
    deliveryMethod?: TDeliveryMethod | '';
    allowCourierExtra?: boolean;
    region?: string;
    district?: string;
    city?: string;
    street?: string;
    house?: string;
    apartment?: string;
    postalCode?: string;
    defaultPaymentMethod?: TPaymentMethod | '';
    customerComment?: string;
}

export type TOrderDraftUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TFieldErrorResponse<'checkout'>
    | TGeneralErrorResponse
    | TSuccessResponse;

/// Подтверждение оформления заказа ///
export interface IOrderDraftConfirmBody {
    firstName: string;
    lastName: string;
    middleName?: string;
    email: string;
    phone: string;
    deliveryMethod: TDeliveryMethod;
    allowCourierExtra?: boolean;
    region?: string;
    district?: string;
    city?: string;
    street?: string;
    house?: string;
    apartment?: string;
    postalCode?: string;
    defaultPaymentMethod: TPaymentMethod;
    customerComment?: string;
}

export type TOrderDraftConfirmResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TFieldErrorResponse<'checkout'>
    | TLimitationErrorResponse<IOrderDraftConfirmLimitationErrorData>
    | TModifiedErrorResponse<IOrderDraftConfirmModifiedErrorData>
    | TGeneralErrorResponse
    | TSuccessResponse;

interface IOrderDraftConfirmLimitationErrorData extends ICheckoutBaseResponseData {
    currentTotal: number;
    orderItemAdjustments: IProductAdjustment[];
}
interface IOrderDraftConfirmModifiedErrorData extends ICheckoutBaseResponseData {
    orderDraft: IOrderDraft;
    orderItemAdjustments: IProductAdjustment[];
}

/// Отмена оформления заказа ///
export type TOrderDraftDeleteResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse;
