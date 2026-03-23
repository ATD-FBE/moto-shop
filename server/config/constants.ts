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

export const FILE_FIELD_MAP = {
    promotion: ['image'],
    product: ['images']
} as const;

export const ACCESS_TOKEN_MAX_AGE = 1 * 60 * 60 * 1000; // 1 час
//export const ACCESS_TOKEN_MAX_AGE = 10 * 1000;

export const REFRESH_TOKEN_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 дней
//export const REFRESH_TOKEN_MAX_AGE = 30 * 1000;

export const ORDER_DRAFT_EXPIRATION = 15 * 60 * 1000; // 15 минут
//export const ORDER_DRAFT_EXPIRATION = 10 * 1000;

export const ONLINE_TRANSACTION_INIT_EXPIRATION = 5 * 60 * 1000; // 5 минут
export const ORDER_RESERVE_BATCH_SIZE = 10;
