import { MIN_IN_MS, HOUR_IN_MS, DAY_IN_MS } from '@shared/constants.js';

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
export const ORDER_RESERVE_BATCH_SIZE = 10;
