import type {
    TEmptyResponse,
    TAuthErrorResponse,
    TFormFieldsErrorResponse,
    TLimitationErrorResponse,
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
import { TDiscountSource } from './shared.types.js';

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
    orderItemAdjustments: IProductAdjustment[];
}

/// Синхронизация и загрузка черновика заказа ///
export type TOrderDraftSyncResponse =
    | TAuthErrorResponse
    | TLimitationErrorResponse<IOrderDraftSyncLimitationErrorData>
    | TGeneralErrorResponse
    | TSuccessResponse<IOrderDraftSyncSuccessData>;

interface IOrderDraftSyncLimitationErrorData extends ICheckoutBaseResponseData {
    orderDraft: Pick<IOrderDraft, 'items' | 'totals'>;
}

interface IOrderDraftSyncSuccessData extends ICheckoutBaseResponseData {
    orderDraft: IOrderDraft;
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
}

interface IOrderDraftCreateSuccessData extends ICheckoutBaseResponseData {
    orderId: string;
}
