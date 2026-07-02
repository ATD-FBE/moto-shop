import type { IYooMoneyCheckoutConstructor } from '@/types/index.js';
import type { TStorageType, TMongoMode, TBucketType } from '@server/types/config.types.js';
import type { TTokenDecodedUser } from '@server/types/utils.types.js';
import type { TDbUserDoc } from '@server/types/db.types.js';
import type { TEntityType } from '@shared/types/shared.types.js';

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'localnet' | 'production';
            PROTOCOL: 'http' | 'https';
            HOST: string;
            DOMAIN: string;
            PORT?: string;
            SERVER_PORT: string;
            CLIENT_PORT: string;
            JWT_ACCESS_SECRET_KEY: string;
            JWT_REFRESH_SECRET_KEY: string;
            ADMIN_REG_CODE: string;
            MONGO_MODE: TMongoMode;
            MONGO_URI_TEST?: string;
            MONGO_URI_LOCAL?: string;
            MONGO_URI_ATLAS?: string;
            STORAGE_TYPE: TStorageType;
            STORAGE_S3_BUCKET?: string;
            STORAGE_S3_BUCKET_TYPE?: TBucketType;
            STORAGE_S3_ACCESS_KEY?: string;
            STORAGE_S3_SECRET_KEY?: string;
            STORAGE_S3_REGION?: string;
            STORAGE_S3_ENDPOINT?: string;
            YOOKASSA_SHOP_ID: string;
            YOOKASSA_SECRET_KEY: string;
        }
    }

    namespace Express {
        interface Request {
            reqCtx: string;
            rawBody?: Buffer;
            connectionAborted?: boolean;
            connectionTimeout?: boolean;
            user?: TTokenDecodedUser;
            dbUser?: TDbUserDoc;
            entityType?: TEntityType;
            fileUploadError?: {
                field: string;
                type: string | number;
                message: string;
            };
        }
    }

    interface Error {
        errors?: Record<string, unknown>;
        isTimeoutCheck?: boolean;
        isAppError?: boolean;
        statusCode?: number;
        code?: string | number;
        details?: Record<string, unknown>;
        isMulterError?: boolean;
        field?: string;
    }

    interface Window {
        YooMoneyCheckout?: IYooMoneyCheckoutConstructor;
    }
}

export {};
