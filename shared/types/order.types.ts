import type { IDataChange } from './shared.types.js';
import type {
    TUserRole,
    TActiveUserRole,
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
    TTransactionStatus
} from './constants.types.js';

export interface IOrderDataChange extends IDataChange {
    currency?: boolean;
}

export interface IOrder {
    id: string;
    orderNumber: string;
    confirmedAt: string;
    lastActivityAt?: string;
    statusHistory: (IOrderStatusEntry | IOrderStatusEntrySummary)[];
    totals: IOrderTotals;
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
    subtotalAmount?: number;
    totalSavings?: number;
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
        role: TActiveUserRole;
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
    finalUnitPrice: number;
    totalPrice: number;
    originalUnitPrice?: number;
    appliedDiscountSource?: TDiscountSource;
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
        role: TUserRole;
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
        role: TActiveUserRole;
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
        role: TActiveUserRole;
    };
    changedAt: string;
}

export interface IOrderDraftItem {
    productId: string;
    quantity: number;
    priceSnapshot: number;
    appliedDiscountSnapshot: number;
}

export interface IOrderAdjustments {
    productId: string;
    adjustments: {
        deleted?: boolean;
        inactive?: boolean;
        outOfStock?: boolean;
        quantityReduced?: {
            old: number;
            corrected: number;
        };
        price?: {
            old: number;
            corrected: number;
        };
        discount?: {
            old: number;
            corrected: number;
            appliedDiscountSourceSnapshot: TDiscountSource;
        };
    };
    releaseQuantity?: number;
}

export interface IRefundablePayment {
    provider: TCardOnlineProvider;
    transactionId: string;
    amount: number;
}
