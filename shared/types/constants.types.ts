import {
    ALLOWED_IMAGE_MIME_TYPES,
    PRODUCT_UNITS,
    DISCOUNT_SOURCE,
    USER_ROLE,
    PRODUCT_THUMBNAIL_PRESETS,
    INTENT,
    DELIVERY_METHOD,
    PAYMENT_METHOD,
    REFUND_METHOD,
    TRANSACTION_TYPE,
    TRANSACTION_STATUS,
    BANK_PROVIDER,
    CARD_ONLINE_PROVIDER,
    ORDER_STATUS,
    FINANCIALS_STATE,
    FINANCIALS_EVENT,
    REQUEST_STATUS,
} from '@shared/constants.js';

export type TAllowedImageMimeType = typeof ALLOWED_IMAGE_MIME_TYPES[number];
export type TAllowedMimeType = TAllowedImageMimeType;

export type TProductUnit = typeof PRODUCT_UNITS[number];

export type TDiscountSource = typeof DISCOUNT_SOURCE[keyof typeof DISCOUNT_SOURCE];

export type TUserRole = typeof USER_ROLE[keyof typeof USER_ROLE];
export type TActiveUserRole = Exclude<TUserRole, typeof USER_ROLE.SYSTEM>;

export type TProductThumbnailKey = keyof typeof PRODUCT_THUMBNAIL_PRESETS;
export type TProductThumbnailSize = typeof PRODUCT_THUMBNAIL_PRESETS[TProductThumbnailKey];

export type TIntent = typeof INTENT[keyof typeof INTENT];

export type TDeliveryMethod = typeof DELIVERY_METHOD[keyof typeof DELIVERY_METHOD];
export type TDeliveryMethodScope = TDeliveryMethod | 'all';

export type TPaymentMethod = typeof PAYMENT_METHOD[keyof typeof PAYMENT_METHOD];

export type TRefundMethod = typeof REFUND_METHOD[keyof typeof REFUND_METHOD];

export type TTransactionType = typeof TRANSACTION_TYPE[keyof typeof TRANSACTION_TYPE];

export type TTransactionStatus = typeof TRANSACTION_STATUS[keyof typeof TRANSACTION_STATUS];

export type TBankProvider = typeof BANK_PROVIDER[keyof typeof BANK_PROVIDER];

export type TCardOnlineProvider = typeof CARD_ONLINE_PROVIDER[keyof typeof CARD_ONLINE_PROVIDER];

export type TOrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

export type TFinancialsState = typeof FINANCIALS_STATE[keyof typeof FINANCIALS_STATE];

export type TFinancialsEvent = typeof FINANCIALS_EVENT[keyof typeof FINANCIALS_EVENT];

export type TRequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS];

export interface ITransactionTypeConfig {
    label: string;
}

export interface ITransactionStatusConfig {
    label: string;
}

export interface IOrderStatusConfig {
    label: string;
    packingLabel: string | null;
    intent: TIntent;
    active?: boolean;
    final?: boolean;
    cashOnReceiptAllowed?: boolean;
    step: {
        order: number;
        label: string;
        className: string;
        actionBtnLabel: string | null;
        readonly deliveryMethods: readonly TDeliveryMethodScope[];
        rollbackAllowed?: boolean;
    } | null;
}

export interface IFinancialsStateConfig {
    label: string;
    intent: TIntent;
    paidFinal?: boolean;
    cancelFinal?: boolean;
}

export interface IFinancialsEventConfig {
    label: string;
    successful?: boolean;
    intent: TIntent;
}
