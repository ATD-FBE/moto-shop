import { BucketType } from './config.js';
import { SERVER_CONSTANTS } from '../../shared/constants.js';

const { MONGO_MODE, STORAGE_TYPE } = SERVER_CONSTANTS;

declare global {
    namespace NodeJS {
        interface ProcessEnv {
            NODE_ENV: 'development' | 'testing' | 'production';
            PROTOCOL: 'http' | 'https';
            HOST: string;
            DOMAIN: string;
            PORT?: string;
            SERVER_PORT: string;
            CLIENT_PORT: string;
            JWT_ACCESS_SECRET_KEY: string;
            JWT_REFRESH_SECRET_KEY: string;
            ADMIN_REG_CODE: string;
            MONGO_MODE: typeof MONGO_MODE[keyof typeof MONGO_MODE];
            MONGO_URI_LOCAL?: string;
            MONGO_URI_ATLAS?: string;
            STORAGE_TYPE: typeof STORAGE_TYPE[keyof typeof STORAGE_TYPE];
            STORAGE_S3_BUCKET?: string;
            STORAGE_S3_BUCKET_TYPE?: BucketType;
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
            fileUploadError?: {
                field: string;
                type: string;
                message: string;
            };
            user?: {
                id: string;
                role: 'admin' | 'customer';

            };
            rawBody?: Buffer; 
        }
    }
}

export {};
