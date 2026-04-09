import type {
    TActiveUserRole,
    TProductThumbnailSize,
    TPaymentMethod,
    TRefundMethod,
    TTransactionType,
    TTransactionStatus,
    ITransactionStatusConfig,
    TOrderStatus,
    TFinancialsState,
    ITransactionTypeConfig,
    IOrderStatusConfig,
    IFinancialsStateConfig,
    TFinancialsEvent,
    IFinancialsEventConfig
} from '@shared/types/index.js';

export const MAX_DATE_TS = 8640000000000000;
export const UNSORTED_CATEGORY_SLUG = 'unsorted';
export const PROMO_ANNOUNCE_OFFSET_DAYS = 3;
export const ALLOWED_IMAGE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
export const MAX_PROMO_IMAGE_SIZE_MB = 0.5;
export const MAX_PRODUCT_IMAGE_SIZE_MB = 1;
export const PRODUCT_FILES_LIMIT = 20;
export const PRODUCT_UNITS = ['ед.', 'шт.', 'пар.', 'компл.', 'наб.', 'уп.', 'пач.', 'м', 'л'] as const;
export const PRODUCT_BRAND_NEW_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;
export const PRODUCT_RESTOCK_THRESHOLD_MS = 14 * 24 * 60 * 60 * 1000;
export const MIN_ORDER_AMOUNT = 1000;
export const CUSTOMER_TABLE_ORDERS_LOAD_STEP = 2;
export const CURRENCY_EPS = 0.05;

export const USER_ROLE = {
    SYSTEM: 'system',
    ADMIN: 'admin',
    CUSTOMER: 'customer'
} as const;

export const ACTIVE_USER_ROLES: TActiveUserRole[] = [USER_ROLE.ADMIN, USER_ROLE.CUSTOMER];

export const CURRENCY = {
    RUB: 'rub'
} as const;

export const DISCOUNT_SOURCE = {
    NONE: 'none',
    CUSTOMER: 'customer',
    PRODUCT: 'product'
} as const;

export const PRODUCT_THUMBNAIL_PRESETS = {
    small: 80,
    medium: 220
} as const;

export const NOTIFICATION_STATUS = {
    DRAFT: 'draft',
    SENT: 'sent'
} as const;

export const PRODUCT_THUMBNAIL_SIZES: readonly TProductThumbnailSize[] =
    Object.values(PRODUCT_THUMBNAIL_PRESETS);

export const INTENT = {
    NEUTRAL: 'neutral',
    POSITIVE: 'positive',
    NEGATIVE: 'negative',
    WARNING: 'warning',
    HIGHLIGHT: 'highlight',
    BLOCKED: 'blocked'
} as const;

export const DELIVERY_METHOD = {
    SELF_PICKUP: 'self_pickup',
    COURIER: 'courier',
    TRANSPORT_COMPANY: 'transport_company'
} as const;

export const DELIVERY_METHOD_OPTIONS = [
    { value: DELIVERY_METHOD.SELF_PICKUP, label: 'Самовывоз' },
    { value: DELIVERY_METHOD.COURIER, label: 'Курьер магазина',  },
    { value: DELIVERY_METHOD.TRANSPORT_COMPANY, label: 'Транспортная компания' }
] as const;

export const PAYMENT_METHOD = {
    CASH_ON_RECEIPT: 'cash_on_receipt',
    BANK_TRANSFER: 'bank_transfer',
    CARD_ONLINE: 'card_online'
} as const;

export const PAYMENT_METHOD_OPTIONS = [
    { value: PAYMENT_METHOD.CASH_ON_RECEIPT, label: 'Наличные при получении', online: false },
    { value: PAYMENT_METHOD.BANK_TRANSFER, label: 'Банковский перевод', online: false },
    { value: PAYMENT_METHOD.CARD_ONLINE, label: 'Банковская карта (ЮKassa)', online: true }
] as const;

export const OFFLINE_PAYMENT_METHOD_OPTIONS = PAYMENT_METHOD_OPTIONS.filter(opt => !opt.online);
export const ONLINE_PAYMENT_METHOD_OPTIONS = PAYMENT_METHOD_OPTIONS.filter(opt => opt.online);

export const OFFLINE_PAYMENT_METHODS: readonly TPaymentMethod[] = OFFLINE_PAYMENT_METHOD_OPTIONS
    .map(opt => opt.value);
export const ONLINE_PAYMENT_METHODS: readonly TPaymentMethod[] = ONLINE_PAYMENT_METHOD_OPTIONS
    .map(opt => opt.value);

export const REFUND_METHOD = {
    CASH: 'cash',
    BANK_TRANSFER: 'bank_transfer',
    CARD_OFFLINE: 'card_offline',
    CARD_ONLINE: 'card_online'
} as const;

export const REFUND_METHOD_OPTIONS = [
    { value: REFUND_METHOD.CASH, label: 'Наличные', online: false },
    { value: REFUND_METHOD.BANK_TRANSFER, label: 'Банковский перевод', online: false },
    { value: REFUND_METHOD.CARD_OFFLINE, label: 'Банковская карта (вручную)', online: false },
    { value: REFUND_METHOD.CARD_ONLINE, label: 'Банковская карта (ЮKassa)', online: true }
] as const;

export const OFFLINE_REFUND_METHOD_OPTIONS = REFUND_METHOD_OPTIONS.filter(opt => !opt.online);
export const ONLINE_REFUND_METHOD_OPTIONS = REFUND_METHOD_OPTIONS.filter(opt => opt.online);

export const OFFLINE_REFUND_METHODS: readonly TRefundMethod[] = OFFLINE_REFUND_METHOD_OPTIONS
    .map(opt => opt.value);
export const ONLINE_REFUND_METHODS: readonly TRefundMethod[] = ONLINE_REFUND_METHOD_OPTIONS
    .map(opt => opt.value);

export const TRANSACTION_TYPE = {
    PAYMENT: 'payment',
    REFUND: 'refund'
} as const;

export const TRANSACTION_TYPE_CONFIG: Record<TTransactionType, ITransactionTypeConfig> = {
    [TRANSACTION_TYPE.PAYMENT]: { label: 'Оплата' },
    [TRANSACTION_TYPE.REFUND]: { label: 'Возврат средств' }
} as const;

export const TRANSACTION_STATUS = {
    INIT: 'init',
    PROCESSING: 'processing'
} as const;

export const TRANSACTION_STATUS_CONFIG: Record<TTransactionStatus, ITransactionStatusConfig> = {
    [TRANSACTION_STATUS.INIT]: { label: 'Подготовка' },
    [TRANSACTION_STATUS.PROCESSING]: { label: 'В обработке' }
} as const;

export const BANK_PROVIDER = {
    SEVERE_BANK: 'severe_bank',
    BANKOMYOT: 'bankomyot',
    IRON_CREDIT: 'iron_credit',
    OLD_LEDGER: 'old_ledger',
    BLACK_LEDGER: 'black_ledger',
    TRUST_AND_HOPE: 'trust_and_hope',
    CASHFLOW_UNION: 'cashflow_union',
    NORTH_CAPITAL: 'north_capital'
} as const;

export const BANK_PROVIDER_OPTIONS = [
    { value: BANK_PROVIDER.SEVERE_BANK, label: '«Суровый Банк»' },
    { value: BANK_PROVIDER.BANKOMYOT, label: '«Банкомёт»' },
    { value: BANK_PROVIDER.IRON_CREDIT, label: '«Железный Кредит»' },
    { value: BANK_PROVIDER.OLD_LEDGER, label: '«Старая Книга»' },
    { value: BANK_PROVIDER.BLACK_LEDGER, label: '«Чёрная Бухгалтерия»' },
    { value: BANK_PROVIDER.TRUST_AND_HOPE, label: '«Доверие и Надежда»' },
    { value: BANK_PROVIDER.CASHFLOW_UNION, label: '«Союз Денежного Потока»' },
    { value: BANK_PROVIDER.NORTH_CAPITAL, label: '«Северный Капитал»' }
] as const;

export const CARD_ONLINE_PROVIDER = {
    YOOKASSA: 'yookassa'
} as const;

export const CARD_ONLINE_PROVIDER_OPTIONS = [
    { value: CARD_ONLINE_PROVIDER.YOOKASSA, label: '«ЮKassa»' }
] as const;

export const ORDER_STATUS = {
    DRAFT: 'draft',
    CONFIRMED: 'confirmed',
    PROCESSING: 'processing',
    READY_FOR_PICKUP: 'ready_for_pickup',
    READY_FOR_SHIPMENT: 'ready_for_shipment',
    PICKED_UP: 'picked_up',
    IN_TRANSIT: 'in_transit',
    DELIVERED: 'delivered',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
} as const;

export const ORDER_STATUS_CONFIG: Record<TOrderStatus, IOrderStatusConfig> = {
    [ORDER_STATUS.DRAFT]: {
        label: 'Черновик заказа',
        packingLabel: null,
        intent: INTENT.NEUTRAL,
        step: null
    },
    [ORDER_STATUS.CONFIRMED]: {
        label: 'Заказ оформлен',
        packingLabel: 'Ожидает очереди',
        intent: INTENT.NEUTRAL,
        active: true,
        step: {
            order: 0,
            label: 'Оформление',
            className: 'step-confirmed',
            actionBtnLabel: null,
            deliveryMethods: ['all']
        }
    },
    [ORDER_STATUS.PROCESSING]: {
        label: 'Заказ обрабатывается',
        packingLabel: 'В процессе сборки',
        intent: INTENT.NEUTRAL,
        active: true,
        step: {
            order: 1,
            label: 'Обработка',
            className: 'step-processing',
            actionBtnLabel: 'Начать сборку',
            deliveryMethods: ['all'],
            rollbackAllowed: true
        }
    },
    [ORDER_STATUS.READY_FOR_PICKUP]: {
        label: 'Готов к выдаче',
        packingLabel: 'Собран',
        intent: INTENT.NEUTRAL,
        active: true,
        step: {
            order: 2,
            label: 'Готовность к выдаче',
            className: 'step-ready-pickup',
            actionBtnLabel: 'Завершить сборку',
            deliveryMethods: [DELIVERY_METHOD.SELF_PICKUP],
            rollbackAllowed: true
        }
    },
    [ORDER_STATUS.READY_FOR_SHIPMENT]: {
        label: 'Готов к отправке',
        packingLabel: 'Готов к отгрузке',
        intent: INTENT.NEUTRAL,
        active: true,
        step: {
            order: 3,
            label: 'Готовность к отправке',
            className: 'step-ready-ship',
            actionBtnLabel: 'Завершить сборку',
            deliveryMethods: [DELIVERY_METHOD.COURIER, DELIVERY_METHOD.TRANSPORT_COMPANY],
            rollbackAllowed: true
        }
    },
    [ORDER_STATUS.PICKED_UP]: {
        label: 'Выдан клиенту',
        packingLabel: 'Принят',
        intent: INTENT.NEUTRAL,
        active: true,
        cashOnReceiptAllowed: true,
        step: {
            order: 4,
            label: 'Выдача',
            className: 'step-picked-up',
            actionBtnLabel: 'Выдать товары',
            deliveryMethods: [DELIVERY_METHOD.SELF_PICKUP],
            rollbackAllowed: true
        }
    },
    [ORDER_STATUS.IN_TRANSIT]: {
        label: 'В пути к клиенту',
        packingLabel: 'Отгружен',
        intent: INTENT.NEUTRAL,
        active: true,
        step: {
            order: 5,
            label: 'Перевозка',
            className: 'step-in-transit',
            actionBtnLabel: 'Отгрузить товары',
            deliveryMethods: [DELIVERY_METHOD.COURIER, DELIVERY_METHOD.TRANSPORT_COMPANY],
            rollbackAllowed: true
        }
    },
    [ORDER_STATUS.DELIVERED]: {
        label: 'Доставлен клиенту',
        packingLabel: 'Принят',
        intent: INTENT.NEUTRAL,
        active: true,
        cashOnReceiptAllowed: true,
        step: {
            order: 6,
            label: 'Получение',
            className: 'step-delivered',
            actionBtnLabel: 'Выгрузить товары',
            deliveryMethods: [DELIVERY_METHOD.COURIER, DELIVERY_METHOD.TRANSPORT_COMPANY],
            rollbackAllowed: true
        }
    },
    [ORDER_STATUS.COMPLETED]: {
        label: 'Заказ выполнен',
        packingLabel: 'Принят',
        intent: INTENT.POSITIVE,
        final: true,
        cashOnReceiptAllowed: true,
        step: {
            order: 7,
            label: 'Завершение',
            className: 'step-completed',
            actionBtnLabel: 'Завершить заказ',
            deliveryMethods: ['all']
        }
    },
    [ORDER_STATUS.CANCELLED]: {
        label: 'Заказ отменён',
        packingLabel: 'Не требуется',
        intent: INTENT.NEGATIVE,
        final: true,
        cashOnReceiptAllowed: true,
        step: {
            order: 8,
            label: 'Отмена',
            className: 'step-cancelled',
            actionBtnLabel: 'Отменить заказ',
            deliveryMethods: ['all']
        }
    }
} as const;

export const ORDER_ACTIVE_STATUSES: readonly TOrderStatus[] = Object.entries(ORDER_STATUS_CONFIG)
  .filter(([_, cfg]) => cfg.active)
  .map(([status]) => status as TOrderStatus);

export const ORDER_FINAL_STATUSES: readonly TOrderStatus[] = Object.entries(ORDER_STATUS_CONFIG)
    .filter(([_, cfg]) => cfg.final)
    .map(([status]) => status as TOrderStatus);

export const CASH_ON_RECEIPT_ALLOWED_STATUSES: readonly TOrderStatus[] = Object.entries(ORDER_STATUS_CONFIG)
    .filter(([_, cfg]) => cfg.cashOnReceiptAllowed)
    .map(([status]) => status as TOrderStatus);

export const FINANCIALS_STATE = {
    // Состояния активного/завершённого заказа
    PAID_PENDING: 'paid_pending',      // Ожидание оплаты (netPaid === 0)
    PAID_PARTIAL: 'paid_partial',      // Частичная оплата (netPaid > 0 && netPaid < totalAmount)
    PAID: 'paid',                      // Полная оплата (netPaid === totalAmount)
    OVERPAID: 'overpaid',              // Переплата (netPaid > totalAmount)
    PAID_NEGATIVE: 'paid_negative',    // Отрицательная оплата после возврата (netPaid < 0)

    // Состояния отменённого заказа
    VOIDED: 'voided',                  // Отмена заказа до оплаты (netPaid === 0)
    REFUND_PENDING: 'refund_pending',  // Отмена заказа при имеющейся оплате (netPaid > 0)
    REFUNDED: 'refunded',              // Полный возврат (netPaid === 0)
    OVER_REFUNDED: 'over_refunded'     // Перевозврат (netPaid < 0)
} as const;

export const FINANCIALS_STATE_CONFIG: Record<TFinancialsState, IFinancialsStateConfig> = {
    [FINANCIALS_STATE.PAID_PENDING]: { label: 'Ожидает оплаты', intent: INTENT.NEUTRAL },
    [FINANCIALS_STATE.PAID_PARTIAL]: { label: 'Оплачен частично', intent: INTENT.NEUTRAL },
    [FINANCIALS_STATE.PAID]: { label: 'Оплачен полностью', intent: INTENT.POSITIVE, paidFinal: true },
    [FINANCIALS_STATE.OVERPAID]: { label: 'Оплачен с излишком', intent: INTENT.HIGHLIGHT },
    [FINANCIALS_STATE.PAID_NEGATIVE]: { label: 'Оплата в минусе', intent: INTENT.NEGATIVE },
    [FINANCIALS_STATE.VOIDED]: { label: 'Не оплачивался', intent: INTENT.BLOCKED, cancelFinal: true },
    [FINANCIALS_STATE.REFUND_PENDING]: { label: 'Ожидает возврата средств', intent: INTENT.WARNING },
    [FINANCIALS_STATE.REFUNDED]: { label: 'Средства возвращены', intent: INTENT.BLOCKED, cancelFinal: true },
    [FINANCIALS_STATE.OVER_REFUNDED]: { label: 'Избыточный возврат средств', intent: INTENT.NEGATIVE }
} as const;

export const FINANCIALS_PAID_FINAL_STATES: readonly TFinancialsState[] =
    Object.entries(FINANCIALS_STATE_CONFIG)
        .filter(([_, cfg]) => cfg.paidFinal)
        .map(([state]) => state as TFinancialsState);

export const FINANCIALS_CANCEL_FINAL_STATES: readonly TFinancialsState[] =
    Object.entries(FINANCIALS_STATE_CONFIG)
        .filter(([_, cfg]) => cfg.cancelFinal)
        .map(([state]) => state as TFinancialsState);

export const FINANCIALS_FINAL_STATES: readonly TFinancialsState[] = [
    ...FINANCIALS_PAID_FINAL_STATES,
    ...FINANCIALS_CANCEL_FINAL_STATES
] as const;

export const FINANCIALS_ACTIVE_STATES: readonly TFinancialsState[] =
    (Object.keys(FINANCIALS_STATE_CONFIG) as TFinancialsState[])
        .filter(state => !FINANCIALS_FINAL_STATES.includes(state));

export const FINANCIALS_EVENT = {
    PAYMENT_SUCCESS: 'payment_success',
    PAYMENT_FAILED: 'payment_failed',
    REFUND_SUCCESS: 'refund_success',
    REFUND_FAILED: 'refund_failed'
} as const;

export const FINANCIALS_EVENT_CONFIG: Record <TFinancialsEvent, IFinancialsEventConfig> = {
    [FINANCIALS_EVENT.PAYMENT_SUCCESS] : {
        label: 'Оплата',
        successful: true,
        intent: INTENT.POSITIVE
    },
    [FINANCIALS_EVENT.PAYMENT_FAILED] : {
        label: 'Попытка оплаты',
        intent: INTENT.NEGATIVE
    },
    [FINANCIALS_EVENT.REFUND_SUCCESS] : {
        label: 'Возврат средств',
        successful: true,
        intent: INTENT.POSITIVE
    },
    [FINANCIALS_EVENT.REFUND_FAILED] : {
        label: 'Попытка возврата средств',
        intent: INTENT.NEGATIVE
    }
} as const;

export const SUCCESSFUL_FINANCIALS_EVENTS: readonly TFinancialsEvent[] =
    Object.entries(FINANCIALS_EVENT_CONFIG)
        .filter(([_, cfg]) => cfg.successful)
        .map(([event]) => event as TFinancialsEvent);

export const ORDER_ACTION = {
    NEXT: 'next',
    ROLLBACK: 'rollback',
    CANCEL: 'cancel'
} as const;

export const REQUEST_STATUS = {
    SUCCESS: 'success',
    PARTIAL: 'partial',
    MODIFIED: 'modified',
    UNAUTH: 'unauth',
    USER_GONE: 'user_gone',
    DENIED: 'denied',
    BAD_REQUEST: 'bad_request',
    FORBIDDEN: 'forbidden',
    NOT_FOUND: 'not_found',
    UNCHANGED: 'unchanged',
    NO_SELECTION: 'no_selection',
    LIMITATION: 'limitation',
    CONFLICT: 'conflict',
    INVALID: 'invalid',
    ERROR: 'error',
    TIMEOUT: 'network',
    ABORTED: 'aborted'
} as const;
