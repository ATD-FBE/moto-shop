import {
    BOOL_FILTER_VALUES,
    ALLOWED_IMAGE_MIME_TYPES,
    PRODUCT_UNITS,
    USER_ROLE,
    REGISTERED_USER_ROLES,
    CURRENCY,
    DISCOUNT_SOURCE,
    PRODUCT_THUMBNAIL_PRESETS,
    NOTIFICATION_STATUS,
    PRODUCTS_PAGE_CONTEXT,
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
import {
    notificationsSortOptions,
    customersSortOptions,
    productsSortOptions,
    productEditorSortOptions,
    ordersSortOptions
} from '@shared/sortOptions.js';
import {
    customersFilterOptions,
    productsFilterConfig,
    productCatalogFilterOptions,
    productEditorFilterOptions,
    ordersFilterOptions
} from '@shared/filterOptions.js';

///////////////////
/// DATA CHANGE ///
///////////////////

export interface IDataChange {
    field: string;
    oldValue?: unknown;
    newValue?: unknown;
}

/////////////
/// QUERY ///
/////////////

export interface IBaseQuery<TSort extends string = string> {
    page?: string;
    limit?: string;
    sort?: TSort | `-${TSort}`;
    search?: string;
    timestamp?: string;
    timeZoneOffset?: string;
}

export type TFilterParams = Record<string, string>;

export type TQuery<TModel extends object, TFilter extends TFilterParams = {}> =
    IBaseQuery<Extract<keyof TModel, string>> &
    TFilter;

export type TInferFilterParams<T extends TFilterOption> = {
    [K in T as 
        K extends { paramName: infer P }
            ? (P extends string ? P : never)
            : K extends {
                minParamName: infer MinP;
                maxParamName: infer MaxP;
            } ? (MinP extends string ? MinP : never) | (MaxP extends string ? MaxP : never)
                : never
    ]?: K extends { type: 'boolean' }
        ? TBoolFilterValue
        : K extends {
            type: 'string';
            valueOptions: readonly { value: infer V }[];
        }
            ? V
            : string; // number || date
};

/////////////////
/// CONSTANTS ///
/////////////////

export type TBoolFilterValue = typeof BOOL_FILTER_VALUES[number];

export type TAllowedImageMimeType = typeof ALLOWED_IMAGE_MIME_TYPES[number];
export type TAllowedMimeType = TAllowedImageMimeType;

export type TProductUnit = typeof PRODUCT_UNITS[number];

export type TUserRole = typeof USER_ROLE[keyof typeof USER_ROLE];
export type TRegisteredUserRole = typeof REGISTERED_USER_ROLES[number];

export type TCurrency = typeof CURRENCY[keyof typeof CURRENCY];

export type TDiscountSource = typeof DISCOUNT_SOURCE[keyof typeof DISCOUNT_SOURCE];

export type TNotificationStatus = typeof NOTIFICATION_STATUS[keyof typeof NOTIFICATION_STATUS];

export type TProductsPageContext = typeof PRODUCTS_PAGE_CONTEXT[keyof typeof PRODUCTS_PAGE_CONTEXT];

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

export interface IDotNotationPatch {
    path: string;
    value: any;
}

//////////////////////
/// FILTER OPTIONS ///
//////////////////////

export type TCustomersFilterOption = typeof customersFilterOptions[number];
export type TProductFilterOptionConfig = typeof productsFilterConfig[number];
export type TProductCatalogFilterOption = typeof productCatalogFilterOptions[number];
export type TProductEditorFilterOption = typeof productEditorFilterOptions[number];
export type TOrdersFilterOption = typeof ordersFilterOptions[number];

export type TFilterOptionConfig<TContext extends string> = TFilterOption & {
    contexts: readonly TContext[];
    defaultByContext?: Partial<Record<TContext, TBoolFilterValue>>;
};

export type TFilterOption<TModel extends object = any> = 
    | INumberFilter<TModel> 
    | IDateFilter<TModel> 
    | IBooleanFilter<TModel> 
    | IStringFilter<TModel>;

export interface IStringFilterValueOption {
    value: string;
    label: string;
    matches?: string[]
}

interface IBaseFilter<TModel> {
    dbField: Extract<keyof TModel, string>; 
    label: string;
}

interface INumberFilter<TModel> extends IBaseFilter<TModel> {
    type: 'number';
    minParamName: string;
    maxParamName: string;
    minLimit: string;
    maxLimit: string;
}

interface IDateFilter<TModel> extends IBaseFilter<TModel> {
    type: 'date';
    minParamName: string;
    maxParamName: string;
    minLimit: string;
    maxLimit: string;
}

interface IBooleanFilter<TModel> extends IBaseFilter<TModel> {
    type: 'boolean';
    paramName: string;
    defaultValue?: TBoolFilterValue;
}

interface IStringFilter<TModel> extends IBaseFilter<TModel> {
    type: 'string';
    paramName: string;
    valueOptions: IStringFilterValueOption[];
    defaultValue?: string;
}

////////////////////
/// SORT OPTIONS ///
////////////////////

export type TNotificationsSortOption = typeof notificationsSortOptions[number];
export type TCustomersSortOption = typeof customersSortOptions[number];
export type TProductsSortOption = typeof productsSortOptions[number];
export type TProductEditorSortOption = typeof productEditorSortOptions[number];
export type TOrdersSortOption = typeof ordersSortOptions[number];

export interface ISortOption<TModel = any> {
    dbField: Extract<keyof TModel, string>;
    label: string;
    defaultOrder: 'asc' | 'desc';
}
