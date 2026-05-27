import { USER_ROLE } from '@shared/constants.js';
import type {
    TEmptyResponse,
    TAuthErrorResponse,
    TFieldErrorResponse,
    TLimitationErrorResponse,
    TModifiedErrorResponse,
    TGeneralErrorResponse,
    TSuccessResponse,
    TFileResponse
} from './apiResponse.types.js';
import type { IProductAdjustment } from './product.types.js';
import type {
    IDataChange,
    TDiscountSource,
    TDeliveryMethod,
    TPaymentMethod,
    TRefundMethod,
    TOrderStatus,
    TFinancialsEvent,
    TFinancialsState,
    TBankProvider,
    TCardOnlineProvider,
    TTransactionType,
    TTransactionStatus,
    TInferFilterParams,
    TOrdersFilterOption,
    IBaseQuery,
    TOrdersSortOption,
    TOrderViewMode,
    TOrderAction
} from './shared.types.js';

////////////
/// MAIN ///
////////////

export interface IOrderDataChange extends IDataChange {
    currency?: boolean;
}

export interface IOrder {
    id: string;
    orderNumber: string;
    confirmedAt: string;
    lastActivityAt?: string;
    statusHistory: (IOrderStatusEntry | IOrderStatusEntrySummary)[];
    totals: IOrderTotals | Pick<IOrderTotals, 'totalAmount'>;
    items?: IOrderItem[];
    totalItems?: number;
    customerInfo?: ICustomerInfo;
    delivery: IDelivery;
    financials: IFinancials;
    customerComment?: string;
    internalNote?: string;
    auditLog?: IAuditLogEntry[];
}

export interface IOrderTotals {
    subtotalAmount: number;
    totalSavings: number;
    totalAmount: number;
}

export interface IOrderStatusEntry {
    status: TOrderStatus;
    isRollback?: boolean;
    changes?: IOrderDataChange[];
    cancellationReason?: string;
    changedBy: {
        id: string;
        name: string;
        role: typeof USER_ROLE.CUSTOMER | typeof USER_ROLE.ADMIN;
    };
    changedAt: string;
    lastActiveStatus?: TOrderStatus;
}

export interface IOrderStatusEntrySummary {
    status: TOrderStatus;
    changedAt: string;
    lastActiveStatus?: TOrderStatus;
}

export interface IOrderItem {
    productId: string;
    image?: string;
    sku?: string;
    name: string;
    brand?: string;
    quantity: number;
    unit: string;
    appliedDiscount: number;
    appliedDiscountSource?: TDiscountSource;
    finalUnitPrice: number;
    totalPrice: number;
    originalUnitPrice?: number;
}

export interface ICustomerInfo {
    firstName: string;
    lastName: string;
    middleName?: string;
    email: string;
    phone: string;
    customerId?: string;
    login?: string;
    registrationEmail?: string;
}

export interface IDelivery {
    deliveryMethod: TDeliveryMethod;
    allowCourierExtra?: boolean;
    shippingAddress?: {
        region?: string;
        district?: string;
        city: string;
        street: string;
        house: string;
        apartment?: string;
        postalCode?: string;
    };
    shippingCost?: number | null;
}

export interface IFinancials {
    defaultPaymentMethod: TPaymentMethod;
    state: TFinancialsState;
    totalPaid: number;
    totalRefunded: number;
    eventHistory: (IFinancialsEventEntry | IFinancialsEventEntrySummary)[];
    currentOnlineTransaction?: ICurrentOnlineTransaction;
}

export interface IFinancialsEventEntry {
    eventId: string;
    event: TFinancialsEvent;
    action: IFinancialsEventAction;
    changedBy: {
        id?: string;
        name: string;
        role: typeof USER_ROLE.ADMIN | typeof USER_ROLE.SYSTEM;
    };
    changedAt: string;
    voided?: IFinancialsEventVoided;
}

export interface IFinancialsEventEntrySummary {
    event: TFinancialsEvent;
    action: { amount: number };
    changedAt: string;
}

export interface IFinancialsEventAction {
    method: TPaymentMethod | TRefundMethod;
    amount: number;
    provider?: TBankProvider | TCardOnlineProvider;
    transactionId?: string;
    originalPaymentId?: string;
    failureReason?: string;
    externalReference?: string;
}

export interface IFinancialsEventVoided {
    flag: boolean;
    note?: string;
    changedBy: {
        id: string;
        name: string;
        role: typeof USER_ROLE.ADMIN;
    };
    changedAt: string;
}

export interface ICurrentOnlineTransaction {
    type: TTransactionType;
    providers?: TCardOnlineProvider[];
    status?: TTransactionStatus;
    amount?: number;
    confirmationUrl?: string;
}

export interface IAuditLogEntry {
    changes: IOrderDataChange[];
    reason: string;
    changedBy: {
        id: string;
        name: string;
        role: typeof USER_ROLE.ADMIN;
    };
    changedAt: string;
}

export interface IRefundablePayment {
    provider: TCardOnlineProvider;
    transactionId: string;
    amount: number;
}

/////////////////////////////
/// REQUESTS - ORDER CORE ///
/////////////////////////////

/// Загрузка списка заказов для одной страницы ///
export type TOrderListFilterParams = TInferFilterParams<TOrdersFilterOption>;
export type TOrderListQuery = IBaseQuery<TOrdersSortOption['dbField']> & TOrderListFilterParams;

export type TOrderListResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<IOrderListSuccessData>;

interface IOrderListSuccessData {
    filteredOrderIdList: string[];
    paginatedOrderList: IOrder[];
}

/// Загрузка или обновление отдельного заказа ///
export type TOrderQuery = {
    viewMode: TOrderViewMode;
};

export type TOrderResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<IOrderSuccessData>;

interface IOrderSuccessData {
    order: IOrder;
}

/// Загрузка доступного на складе количества товаров в заказе ///
export type TOrderItemsAvailabilityResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<IOrderItemsAvailabilitySuccessData>;

interface IOrderItemsAvailabilitySuccessData {
    orderItemsAvailabilityMap: Record<string, number>;
}

/// Повтор завершённого или отменённого заказа ///
export type TOrderRepeatResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse;

/// Изменение внутренней заметки заказа (SSE) ///
export interface IOrderInternalNoteUpdateBody {
    internalNote: string;
}

export type TOrderInternalNoteUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TFieldErrorResponse<'order'>
    | TGeneralErrorResponse
    | TSuccessResponse;
    
/// Изменение деталей подтверждённого заказа (SSE) ///
export interface IOrderDetailsUpdateBody {
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
    customerComment?: string;
    editReason: string;
}

export type TOrderDetailsUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TFieldErrorResponse<'order'>
    | TGeneralErrorResponse
    | TSuccessResponse;
    
/// Изменение товаров подтверждённого заказа (SSE) ///
export interface IOrderItemsUpdateBody {
    items: { productId: string, quantity: number }[],
    editReason: string;
}

export type TOrderItemsUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TFieldErrorResponse<'order'>
    | TLimitationErrorResponse<IOrderItemsUpdateLimitationErrorData>
    | TModifiedErrorResponse<IOrderItemsUpdateModifiedErrorData>
    | TGeneralErrorResponse
    | TSuccessResponse<IOrderItemsUpdateSuccessData>;

interface IOrderItemsUpdateLimitationErrorData {
    orderItemAdjustments: IProductAdjustment[];
}
interface IOrderItemsUpdateModifiedErrorData {
    orderItemAdjustments: IProductAdjustment[];
}
interface IOrderItemsUpdateSuccessData {
    orderItemAdjustments: IProductAdjustment[];
}

/// Изменение статуса заказа (SSE) ///
export interface IOrderStatusUpdateBody {
    action: TOrderAction;
    formFields?: {
        shippingCost?: number;
        cancellationReason?: string;
    };
}

export type TOrderStatusUpdateResponse =
    | TAuthErrorResponse
    | TFieldErrorResponse<'order'>
    | TLimitationErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse;

///////////////////////////////////
/// REQUESTS - ORDER FINANCIALS ///
///////////////////////////////////

/// Генерация и загрузка счёта заказа в pdf ///
export type TOrderInvoicePdfResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TFileResponse;
    
/// Вычисление и загрузка остатка для оплаты заказа банковской картой онлайн ///
export type TOrderRemainingAmountResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<IOrderRemainingAmountSuccessData>;

interface IOrderRemainingAmountSuccessData {
    remainingAmount: number;
    orderNumber: string;
}

/// Аннулирование записи успешного финансового оффлайн-события в заказе (SSE) ///
export interface IOrderFinancialsEventVoidBody {
    voidedNote?: string;
}

export type TOrderFinancialsEventVoidResponse =
    | TAuthErrorResponse
    | TFieldErrorResponse<'financials'>
    | TGeneralErrorResponse
    | TSuccessResponse;
    
/// Внесение оплаты за заказ оффлайн-методом (SSE) ///
export interface IOrderOfflinePaymentApplyBody {
    transaction: {
        method: TPaymentMethod;
        provider?: TBankProvider;
        amount: number;
        transactionId?: string;
        markAsFailed?: boolean;
        failureReason?: string;
    }
}

export type TOrderOfflinePaymentApplyResponse =
    | TAuthErrorResponse
    | TFieldErrorResponse<'payment'>
    | TGeneralErrorResponse
    | TSuccessResponse;
    
/// Возврат средств за заказ оффлайн-методом (SSE) ///
export interface IOrderOfflineRefundApplyBody {
    transaction: {
        method: TRefundMethod;
        provider?: TBankProvider;
        amount: number;
        transactionId?: string;
        markAsFailed?: boolean;
        failureReason?: string;
        externalReference?: string;
    }
}

export type TOrderOfflineRefundApplyResponse =
    | TAuthErrorResponse
    | TFieldErrorResponse<'refund'>
    | TGeneralErrorResponse
    | TSuccessResponse;
    
/// Создание онлайн платежа для банковской карты ///
