/////////////
/// TYPES ///
/////////////

export type TDiscountSource = typeof DISCOUNT_SOURCE[keyof typeof DISCOUNT_SOURCE];

export type TUserRole = typeof USER_ROLE[keyof typeof USER_ROLE];

export type TProductThumbnailPresets =
    typeof PRODUCT_THUMBNAIL_PRESETS[keyof typeof PRODUCT_THUMBNAIL_PRESETS];

export type TIntent = typeof INTENT[keyof typeof INTENT];

export type TDeliveryMethod = typeof DELIVERY_METHOD[keyof typeof DELIVERY_METHOD];
export type TDeliveryMethodScope = TDeliveryMethod | 'all';

export type TPaymentMethod = typeof PAYMENT_METHOD[keyof typeof PAYMENT_METHOD];

export type TRefundMethod = typeof REFUND_METHOD[keyof typeof REFUND_METHOD];

export type TTransactionType = typeof TRANSACTION_TYPE[keyof typeof TRANSACTION_TYPE];

export type TOnlineTransactionStatus =
    typeof ONLINE_TRANSACTION_STATUS[keyof typeof ONLINE_TRANSACTION_STATUS];

export type TBankProvider = typeof BANK_PROVIDER[keyof typeof BANK_PROVIDER];

export type TCardOnlineProvider = typeof CARD_ONLINE_PROVIDER[keyof typeof CARD_ONLINE_PROVIDER];

export type TOrderStatus = typeof ORDER_STATUS[keyof typeof ORDER_STATUS];

export type TFinancialsState = typeof FINANCIALS_STATE[keyof typeof FINANCIALS_STATE];

export type TFinancialsEvent = typeof FINANCIALS_EVENT[keyof typeof FINANCIALS_EVENT];

export type TRequestStatus = typeof REQUEST_STATUS[keyof typeof REQUEST_STATUS];

export type TFormStatus = typeof FORM_STATUS[keyof typeof FORM_STATUS];

type TClientConstants = typeof CLIENT_CONSTANTS_DATA;
type TServerConstants = typeof SERVER_CONSTANTS_DATA;

//////////////////
/// INTERFACES ///
//////////////////

interface ITransactionTypeConfig {
    label: string;
}

interface IOnlineTransactionStatusConfig {
    label: string;
}

interface IOrderStatusConfig {
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

interface IFinancialsStateConfig {
    label: string;
    intent: TIntent;
    paidFinal?: boolean;
    cancelFinal?: boolean;
}

interface IFinancialsEventConfig {
    label: string;
    successful?: boolean;
    intent: TIntent;
}

////////////////////////
/// COMMON CONSTANTS ///
////////////////////////

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
    ADMIN: 'admin',
    CUSTOMER: 'customer'
} as const;

export const DISCOUNT_SOURCE = {
    NONE: 'none',
    CUSTOMER: 'customer',
    PRODUCT: 'product'
} as const;

export const SEARCH_TYPES = {
    REGEX: 'regex',
    TEXT: 'text'
} as const;

export const DEFAULT_SEARCH_TYPE = SEARCH_TYPES.REGEX;

export const PRODUCT_THUMBNAIL_PRESETS = {
    small: 80,
    medium: 220
} as const;

export const PRODUCT_THUMBNAIL_SIZES: readonly TProductThumbnailPresets[] =
    Object.values(PRODUCT_THUMBNAIL_PRESETS);

export const FILE_FIELD_MAP = {
    promotion: ['image'],
    product: ['images']
} as const;

export const ORDER_MODEL_TYPE = {
    DRAFT: 'draft',
    FINAL: 'final'
} as const;

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

export const ONLINE_TRANSACTION_STATUS = {
    INIT: 'init',
    PROCESSING: 'processing'
} as const;

export const ONLINE_TRANSACTION_STATUS_CONFIG: Record<
    TOnlineTransactionStatus,
    IOnlineTransactionStatusConfig
> = {
    [ONLINE_TRANSACTION_STATUS.INIT]: { label: 'Подготовка' },
    [ONLINE_TRANSACTION_STATUS.PROCESSING]: { label: 'В обработке' }
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

export const NOTIFICATION_STATUS = {
    DRAFT: 'draft',
    SENT: 'sent'
} as const;

export const FIELD_UI_STATUS = {
    VALID: 'valid',
    CHANGED: 'changed',
    INVALID: 'invalid'
} as const;

export const FIELD_SAVE_STATUS = {
    SAVING: 'saving',
    SUCCESS: 'success',
    ERROR: 'error'
} as const;

export const FIELD_SAVE_STATUS_MESSAGES = {
    [FIELD_SAVE_STATUS.SAVING]: '⏳ Сохранение...',
    [FIELD_SAVE_STATUS.SUCCESS]: '✅ Сохранено!',
    [FIELD_SAVE_STATUS.ERROR]: '❌ Ошибка сохранения'
} as const;

export const DATA_LOAD_STATUS = {
    SKIPPED: 'skipped',
    LOADING: 'loading',
    ERROR: 'error',
    NOT_FOUND: 'not_found',
    READY: 'ready'
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
    NETWORK: 'network',
    TIMEOUT: 'timeout',
    ABORTED: 'aborted'
} as const;

export const NETWORK_FAIL_STATUS_CODE = 520; // Свободный код для сетевой ошибки

export const resolveRequestStatus = (statusCode: number, reason: string = ''): TRequestStatus => {
    switch (statusCode) {
        case 200:
        case 201:
            return REQUEST_STATUS.SUCCESS;

        case 204:
            return REQUEST_STATUS.UNCHANGED;

        case 207:
            return REQUEST_STATUS.PARTIAL;

        case 400:
            if (reason === REQUEST_STATUS.NO_SELECTION) return REQUEST_STATUS.NO_SELECTION;
            return REQUEST_STATUS.BAD_REQUEST;

        case 401:
            return REQUEST_STATUS.UNAUTH;

        case 402: // YooKassa - Ошибка подключения к API
            return REQUEST_STATUS.NETWORK;

        case 403:
            if (reason === REQUEST_STATUS.DENIED) return REQUEST_STATUS.DENIED;
            return REQUEST_STATUS.FORBIDDEN;

        case 404:
            return REQUEST_STATUS.NOT_FOUND;

        case 409:
            return REQUEST_STATUS.CONFLICT;

        case 410:
            if (reason === REQUEST_STATUS.USER_GONE) return REQUEST_STATUS.USER_GONE;
            return REQUEST_STATUS.ERROR;

        case 412:
            return REQUEST_STATUS.MODIFIED;

        case 422:
            if (reason === REQUEST_STATUS.LIMITATION) return REQUEST_STATUS.LIMITATION;
            return REQUEST_STATUS.INVALID;

        case 499: // Происходит только при переходе на другую страницу с активными запросами
            return REQUEST_STATUS.ABORTED;

        case 500:
            return REQUEST_STATUS.ERROR;

        case NETWORK_FAIL_STATUS_CODE:
            if (reason === REQUEST_STATUS.TIMEOUT) return REQUEST_STATUS.NETWORK;
            return REQUEST_STATUS.ERROR;

        default:
            return REQUEST_STATUS.ERROR;
    }
};

export const FORM_STATUS = {
    DEFAULT: 'default',
    LOADING: 'loading',
    LOAD_ERROR: 'load_error',
    CANCELING: 'canceling',
    CANCEL_ERROR: 'cancel_error',
    CANCEL_SUCCESS: 'cancel_success',
    SENDING: 'sending',
    ...REQUEST_STATUS,
    UNKNOWN: 'unknown'
} as const;

interface IBaseSubmitState {
    readonly icon?: string;
    readonly mainMessage?: string;
    readonly addMessage?: string;
    readonly submitBtnLabel: string;
    readonly cancelBtnLabel: string;
    readonly intent?: TIntent;
    readonly locked?: boolean;
}

export const BASE_SUBMIT_STATES: Record<TFormStatus, IBaseSubmitState> = {
    [FORM_STATUS.DEFAULT]: {
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить'
    },
    [FORM_STATUS.LOADING]: {
        icon: '⏳',
        mainMessage: 'Загрузка данных...',
        submitBtnLabel: 'Загрузка...',
        cancelBtnLabel: 'Недоступно',
        intent: INTENT.NEUTRAL,
        locked: true
    },
    [FORM_STATUS.LOAD_ERROR]: {
        icon: '❌',
        mainMessage: 'Не удалось загрузить данные.',
        addMessage: 'Попробуйте повторить загрузку:',
        submitBtnLabel: 'Недоступно',
        cancelBtnLabel: 'Недоступно',
        intent: INTENT.NEGATIVE,
        locked: true
    },
    [FORM_STATUS.CANCELING]: {
        icon: '⏳',
        mainMessage: 'Выполняется отмена...',
        submitBtnLabel: 'Недоступно',
        cancelBtnLabel: 'Отмена...',
        intent: INTENT.NEUTRAL,
        locked: true
    },
    [FORM_STATUS.CANCEL_ERROR]: {
        icon: '❌',
        mainMessage: 'Не удалось отменить операцию.',
        addMessage: 'Попробуйте повторить снова.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEGATIVE
    },
    [FORM_STATUS.CANCEL_SUCCESS]: {
        icon: '❎',
        mainMessage: 'Операция отменена!',
        submitBtnLabel: 'Недоступно',
        cancelBtnLabel: 'Отменено',
        intent: INTENT.WARNING,
        locked: true
    },
    [FORM_STATUS.SENDING]: {
        submitBtnLabel: 'Отправка...',
        cancelBtnLabel: 'Недоступно',
        locked: true
    },
    [FORM_STATUS.UNAUTH]: {
        icon: '⏰',
        mainMessage: 'Сессия истекла.',
        addMessage: 'Требуется повторный вход. Несохранённые данные будут утрачены.',
        submitBtnLabel: 'Недоступно',
        cancelBtnLabel: 'Недоступно',
        intent: INTENT.NEGATIVE,
        locked: true
    },
    [FORM_STATUS.USER_GONE]: {
        icon: '🗑️',
        mainMessage: 'Аккаунт пользователя удалён!',
        addMessage: 'Соболезнуем. Нужна новая авторизация.',
        submitBtnLabel: 'Заблокировано',
        cancelBtnLabel: 'Заблокировано',
        intent: INTENT.NEGATIVE,
        locked: true
    },
    [FORM_STATUS.DENIED]: {
        icon: '⛔',
        mainMessage: 'Доступ запрещён!',
        addMessage: 'Недостаточно прав для выполнения действия.',
        submitBtnLabel: 'Заблокировано',
        cancelBtnLabel: 'Заблокировано',
        intent: INTENT.NEGATIVE,
        locked: true
    },
    [FORM_STATUS.FORBIDDEN]: {
        icon: '⛔',
        mainMessage: 'Операция невозможна',
        addMessage: 'Нет доступа к ресурсу в текущем состоянии.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEGATIVE
    },
    [FORM_STATUS.BAD_REQUEST]: {
        icon: '⚠️',
        mainMessage: 'Некорректный запрос.',
        addMessage: 'Отправленные данные не прошли проверку.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEGATIVE
    },
    [FORM_STATUS.NOT_FOUND]: {
        icon: '🚫',
        mainMessage: 'Исходные данные не найдены.',
        addMessage: 'Изменения невозможны.',
        submitBtnLabel: 'Заблокировано',
        cancelBtnLabel: 'Заблокировано',
        intent: INTENT.NEGATIVE,
        locked: true
    },
    [FORM_STATUS.NO_SELECTION]: {
        icon: '⚠️',
        mainMessage: 'Элементы не выбраны.',
        addMessage: 'Данные не изменены.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEUTRAL
    },
    [FORM_STATUS.CONFLICT]: {
        icon: '⚠️',
        mainMessage: 'Конфликт данных.',
        addMessage: 'Действие невозможно из-за расхождения состояния ресурса.',
        submitBtnLabel: 'Заблокировано',
        cancelBtnLabel: 'Заблокировано',
        intent: INTENT.NEGATIVE,
        locked: true
    },
    [FORM_STATUS.LIMITATION]: {
        icon: '⚠️',
        mainMessage: 'Ограничение на операцию.',
        addMessage: 'Условие для выполнения действия не соблюдено.',
        submitBtnLabel: 'Заблокировано',
        cancelBtnLabel: 'Заблокировано',
        intent: INTENT.NEGATIVE,
        locked: true
    },
    [FORM_STATUS.MODIFIED]: {
        icon: '🔄',
        mainMessage: 'Данные изменились.',
        addMessage: 'Проверьте обновлённые значения и отправьте снова.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEUTRAL
    },
    [FORM_STATUS.UNCHANGED]: {
        icon: 'ℹ️',
        mainMessage: 'Изменений нет.',
        addMessage: 'Данные не изменены.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEUTRAL
    },
    [FORM_STATUS.INVALID]: {
        icon: '⚠️',
        mainMessage: 'Некорректные данные.',
        addMessage: 'Исправьте ошибки в форме.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEGATIVE
    },
    [FORM_STATUS.ERROR]: {
        icon: '❌',
        mainMessage: 'Не удалось выполнить запрос.',
        addMessage: 'Ошибка сервера. Попробуйте снова.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEGATIVE
    },
    [FORM_STATUS.NETWORK]: {
        icon: '❌',
        mainMessage: 'Не удалось выполнить запрос.',
        addMessage: 'Ошибка сети. Попробуйте снова.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEGATIVE
    },
    [FORM_STATUS.TIMEOUT]: {
        icon: '⏰',
        mainMessage: 'Время ожидания истекло.',
        addMessage: 'Сервер слишком долго не отвечал.',
        submitBtnLabel: 'Повторить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEGATIVE
    },
    [FORM_STATUS.ABORTED]: {
        icon: '🚫',
        mainMessage: 'Запрос прерван.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEUTRAL
    },
    [FORM_STATUS.PARTIAL]: {
        icon: '✅⚠️',
        mainMessage: 'Частичное обновление.',
        addMessage: 'Не все данные были изменены.',
        submitBtnLabel: 'Выполнено',
        cancelBtnLabel: 'Недоступно',
        intent: INTENT.POSITIVE,
        locked: true
    },
    [FORM_STATUS.SUCCESS]: {
        icon: '✅',
        mainMessage: 'Данные отправлены!',
        submitBtnLabel: 'Выполнено',
        cancelBtnLabel: 'Недоступно',
        intent: INTENT.POSITIVE,
        locked: true
    },
    [FORM_STATUS.UNKNOWN]: {
        icon: '❓',
        mainMessage: 'Статус не определён.',
        addMessage: 'Уточните состояние операции в консоли или у администратора.',
        submitBtnLabel: 'Отправить',
        cancelBtnLabel: 'Отменить',
        intent: INTENT.NEGATIVE
    }
} as const;

/////////////////////////////////
/// CLIENT & SERVER CONSTANTS ///
/////////////////////////////////

const isServer = typeof window === 'undefined';

const CLIENT_CONSTANTS_DATA = {
    ENV: process.env.APP_ENV,
    PROD_ENV: process.env.APP_ENV === 'production',
    PROTOCOL: process.env.PROTOCOL,
    HOST: process.env.HOST,
    CLIENT_PORT: process.env.CLIENT_PORT,
    SERVER_PORT: process.env.SERVER_PORT,
    YOOKASSA_SHOP_ID: process.env.YOOKASSA_SHOP_ID,
    SUCCESS_DELAY: 1800,
    LOAD_STATUS_MIN_HEIGHT: !isServer 
        ? parseInt(
            getComputedStyle(document.documentElement).getPropertyValue('--load-status-min-height'),
            10
        )
        : 0,
    SCREEN_SIZE: {
        XS: 540 ,
        SMALL: 780,
        MEDIUM: 1180,
        LARGE: Infinity
    },
    MODAL_ANIMATION_DURATION: !isServer
        ? parseInt(
            getComputedStyle(document.documentElement).getPropertyValue('--modal-animation-duration'),
            10
        )
        : 300,
    DASHBOARD_TITLES: {
        GUEST: 'Добро пожаловать!',
        ADMIN: 'Панель администратора',
        CUSTOMER: 'Панель покупателя'
    },
    PRODUCT_IMAGE_LOADER: '/images/product_image_loader.jpg',
    PRODUCT_IMAGE_PLACEHOLDER: '/images/product_image_placeholder.jpg',
    BLANK_IMAGE_SRC: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
    PRODUCT_AUTOSLIDE_TIMER: 5000,
    CATEGORY_ROOT_LABEL: '(корень)',
    NO_VALUE_LABEL: '---',
    TEXT_LOG_LINE_BREAK: '\n\n',
    DATA_LOAD_STATUS,
    REQUEST_STATUS,
    FORM_STATUS,
    BASE_SUBMIT_STATES,
    FIELD_UI_STATUS,
    FIELD_SAVE_STATUS,
    FIELD_SAVE_STATUS_MESSAGES
} as const;

const SERVER_CONSTANTS_DATA = {
    MONGO_MODE: {
        LOCAL: 'local',
        ATLAS: 'atlas'
    },
    STORAGE_TYPE: {
        FS: 'fs',
        S3: 's3'
    },
    MULTER_MODE: {
        DISK: 'disk',
        MEMORY: 'memory'
    },
    TOKEN_COOKIE_OPTIONS: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax', // В запросах нужно указывать credentials: 'include'
        path: '/'
    },
    ERROR_SIGNALS: {
        TIMEOUT_ABORT: 'timeout_abort'
    },
    ACCESS_TOKEN_MAX_AGE: 1 * 60 * 60 * 1000, // 1 час
    //ACCESS_TOKEN_MAX_AGE: 10 * 1000,
    
    REFRESH_TOKEN_MAX_AGE: 7 * 24 * 60 * 60 * 1000, // 7 дней
    //REFRESH_TOKEN_MAX_AGE: 30 * 1000,

    ORDER_DRAFT_EXPIRATION: 15 * 60 * 1000, // 15 минут
    //ORDER_DRAFT_EXPIRATION: 10 * 1000,

    ONLINE_TRANSACTION_INIT_EXPIRATION: 5 * 60 * 1000, // 5 минут
    ORDER_RESERVE_BATCH_SIZE: 10
} as const;

export const CLIENT_CONSTANTS = (!isServer ? CLIENT_CONSTANTS_DATA : {}) as TClientConstants;
export const SERVER_CONSTANTS = (isServer ? SERVER_CONSTANTS_DATA : {}) as TServerConstants;
