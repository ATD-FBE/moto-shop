import { MIN_IN_MS, HOUR_IN_MS, DAY_IN_MS } from '@shared/constants.js';
import type {
    TSelectedFields,
    TDbNews,
    TDbPromo,
    TDbNotification,
    TDbOrderFinal
} from '@server/types/index.js';

export const MONGO_MODE = {
    LOCAL: 'local',
    ATLAS: 'atlas'
} as const;

export const STORAGE_TYPE = {
    FS: 'fs',
    S3: 's3'
} as const;

export const MULTER_MODE = {
    DISK: 'disk',
    MEMORY: 'memory'
} as const;

export const TOKEN_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // В запросах нужно указывать credentials: 'include'
    path: '/'
} as const;

export const ERROR_SIGNALS = {
    TIMEOUT_ABORT: 'timeout_abort'
} as const;

export const ORDER_MODEL_TYPE = {
    DRAFT: 'draft',
    FINAL: 'final'
} as const;

export const SEARCH_TYPES = {
    REGEX: 'regex',
    TEXT: 'text'
} as const;

export const DEFAULT_SEARCH_TYPE = SEARCH_TYPES.REGEX;

export const GENERIC_FILE_FIELD = 'genericFileField';
export const ENTITY_FILE_FIELDS = {
    promotion: ['image'],
    product: ['images']
} as const;

export const ORDER_ADJUSTMENT_TYPE = {
    RESERVE: 'reserve',
    RELEASE: 'release',
    COMMIT: 'commit',
    ADJUST: 'adjust',
    RETURN: 'return'
} as const;

export const AGGREGATE_COLLATION_OPTIONS = { 
    locale: 'en', // Универсальная локаль для мультиязычности
    strength: 2   // Strength 2 означает игнорирование регистра при сравнении
} as const;

export const ACCESS_TOKEN_MAX_AGE = 1 * HOUR_IN_MS; // 1 час
//export const ACCESS_TOKEN_MAX_AGE = 10 * 1000;

export const REFRESH_TOKEN_MAX_AGE = 7 * DAY_IN_MS; // 7 дней
//export const REFRESH_TOKEN_MAX_AGE = 30 * 1000;

export const ORDER_DRAFT_EXPIRATION = 15 * MIN_IN_MS; // 15 минут
//export const ORDER_DRAFT_EXPIRATION = 10 * 1000;

export const ONLINE_TRANSACTION_INIT_EXPIRATION = 5 * MIN_IN_MS; // 5 минут

// Поля из БД для новостей
export const BASE_DB_NEWS_FIELDS: TSelectedFields<TDbNews> = {
    _id: 1,
    publishDate: 1,
    title: 1,
    content: 1
};

export const MANAGED_DB_NEWS_FIELDS: TSelectedFields<TDbNews> = {
    ...BASE_DB_NEWS_FIELDS,
    createdBy: 1,
    updateHistory: 1
};

// Поля из БД для акций
export const BASE_DB_PROMO_FIELDS: TSelectedFields<TDbPromo> = {
    _id: 1,
    title: 1,
    imageFilename: 1,
    description: 1,
    startDate: 1,
    endDate: 1
};

export const MANAGED_DB_PROMO_FIELDS: TSelectedFields<TDbPromo> = {
    ...BASE_DB_PROMO_FIELDS,
    createdBy: 1,
    createdAt: 1,
    updateHistory: 1
};

// Поля из БД для уведомлений
export const BASE_DB_NOTIFICATION_FIELDS: TSelectedFields<TDbNotification> = {
    _id: 1,
    subject: 1,
    message: 1,
    signature: 1,
    sentAt: 1
};

export const MANAGED_DB_NOTIFICATION_FIELDS: TSelectedFields<TDbNotification> = {
    ...BASE_DB_NOTIFICATION_FIELDS,
    status: 1,
    recipients: 1,
    createdBy: 1,
    updateHistory: 1,
    createdAt: 1,
    updatedAt: 1,
    sentBy: 1
};

// Поля из БД для заказов
export const BASE_DB_ORDER_FIELDS: TSelectedFields<TDbOrderFinal> = {
    _id: 1,
    orderNumber: 1,
    confirmedAt: 1,
    lastActivityAt: 1,
    statusHistory: 1,
    totals: 1,
    items: 1,
    customerInfo: 1,
    delivery: 1,
    financials: 1
};

export const MANAGED_DB_ORDER_FIELDS: TSelectedFields<TDbOrderFinal> = {
    ...BASE_DB_ORDER_FIELDS,
    customerComment: 1,
    internalNote: 1,
    auditLog: 1
};
