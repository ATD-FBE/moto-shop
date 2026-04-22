import {
    ALLOWED_IMAGE_MIME_TYPES,
    PRODUCT_UNITS,
    USER_ROLE,
    REGISTERED_USER_ROLES,
    CURRENCY,
    DISCOUNT_SOURCE,
    PRODUCT_THUMBNAIL_PRESETS,
    NOTIFICATION_STATUS,
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
import { validationRules } from '@shared/fieldRules.js';
import { notificationsSortOptions } from '@shared/sortOptions.js';

//////////////
/// SHARED ///
//////////////

export interface IDataChange {
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
}

/////////////////
/// CONSTANTS ///
/////////////////

export type TAllowedImageMimeType = typeof ALLOWED_IMAGE_MIME_TYPES[number];
export type TAllowedMimeType = TAllowedImageMimeType;

export type TProductUnit = typeof PRODUCT_UNITS[number];

export type TUserRole = typeof USER_ROLE[keyof typeof USER_ROLE];
export type TRegisteredUserRole = typeof REGISTERED_USER_ROLES[number];

export type TCurrency = typeof CURRENCY[keyof typeof CURRENCY];

export type TDiscountSource = typeof DISCOUNT_SOURCE[keyof typeof DISCOUNT_SOURCE];

export type TNotificationStatus = typeof NOTIFICATION_STATUS[keyof typeof NOTIFICATION_STATUS];

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

export type IOrderStatusStepConfig = IOrderStatusConfig & {
    step: NonNullable<IOrderStatusConfig['step']>
};

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

///////////////////
/// FIELD RULES ///
///////////////////

export type TEntityType =
    'auth' | 'customer' | 'news' | 'promotion' | 'notification' | 'category' |
    'product' | 'checkout' | 'order' | 'financials' | 'payment' | 'refund';

export type TValidationRuleType = RegExp | ((...args: any[]) => boolean);

export type TValidationRules = typeof validationRules;
export type TEntityField<E extends TEntityType> = keyof TValidationRules[E];

export type TFieldErrorMessages = {
    readonly [E in TEntityType]: {
        readonly [K in TEntityField<E>]: {
            readonly default: string;
            readonly [errorType: string]: string;
        };
    };
};

export type TFieldErrors<E extends TEntityType = TEntityType> =
    Partial<Record<TEntityField<E>, string>>;

//////////////////////
/// COMMON HELPERS ///
//////////////////////

export interface IAppliedDiscount {
    appliedDiscount: number;
    appliedDiscountSource: TDiscountSource;
}

export interface IDotNotationPatch {
    path: string;
    value: any;
}

///////////////
/// COMPANY ///
///////////////

export interface ICompanyDetails {
    _id: string;
    companyName: string;
    shopName: string;
    inn: string;
    ogrn: string;
    phone: string;
    emails: {
        info: string;
        payments: string;
        opt: string;
    };
    legalAddress: string;
    displayAddress: string;
    bank: {
        name: string;
        bik: string;
        rs: string;
        ks: string;
    };
}

export interface IWorkingHours {
    days: string;
    time: string;
    closed?: boolean;
}

//////////////////////
/// FILTER OPTIONS ///
//////////////////////

export interface ICommonFilterQuery {
    timeZoneOffset?: string;
    [key: string]: string | undefined;
}

export type TFilterOption<T = any> = 
    | INumberFilter<T> 
    | IDateFilter<T> 
    | IBooleanFilter<T> 
    | IStringFilter<T>;

interface IBaseFilter<T> {
    dbField: T extends object ? keyof T : T; // T - либо вся коллекция БД, либо поле коллекции
    label: string;
}

interface INumberFilter<T> extends IBaseFilter<T> {
    type: 'number';
    minParamName: string;
    maxParamName: string;
    minLimit: string;
    maxLimit: string;
}

interface IDateFilter<T> extends IBaseFilter<T> {
    type: 'date';
    minParamName: string;
    maxParamName: string;
    minLimit: string;
    maxLimit: string;
}

interface IBooleanFilter<T> extends IBaseFilter<T> {
    type: 'boolean';
    paramName: string;
    defaultValue?: string;
}

interface IStringFilter<T> extends IBaseFilter<T> {
    type: 'string';
    paramName: string;
    valueOptions: {
        value: string;
        label: string;
        matches?: string[]
    }[];
    defaultValue?: string;
}

////////////////////
/// SORT OPTIONS ///
////////////////////

export interface ISortOption<T = any> {
    dbField: T extends object ? keyof T : T; // T - либо вся коллекция БД, либо поле коллекции
    label: string;
    defaultOrder: 'asc' | 'desc';
}

export interface IParseSortResult<T> {
    sortField: keyof T;
    sortOrder: 1 | -1;
}

export type TNotificationsSortOptions = typeof notificationsSortOptions[number];

//////////////////////////
/// PAGE LIMIT OPTIONS ///
//////////////////////////

export type TPageLimitOption<T = number> = T;

export interface IPageLimitQuery {
    sort?: string;
    page?: string;
    limit?: string;
    [key: string]: string | undefined;
}
