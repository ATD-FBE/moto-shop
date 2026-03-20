import dotenv from 'dotenv';
import { join } from 'path';
import { CONFIG_PATH } from './paths.js';
import { SERVER_CONSTANTS } from '../../shared/constants.js';

const { MONGO_MODE, STORAGE_TYPE, MULTER_MODE } = SERVER_CONSTANTS;

const environment = process.env.NODE_ENV || 'development';
dotenv.config({ path: join(CONFIG_PATH, `.env.${environment}`) });

/////////////
/// TYPES ///
/////////////

export type TStorageType = typeof STORAGE_TYPE[keyof typeof STORAGE_TYPE];

export type TMulterMode = typeof MULTER_MODE[keyof typeof MULTER_MODE];

export type TMongoMode = typeof MONGO_MODE[keyof typeof MONGO_MODE];

export type TBucketType = 'public' | 'private';

//////////////////
/// INTERFACES ///
//////////////////

interface IDatabaseConfig {
    readonly mode: TMongoMode;
    readonly uri: string;
}

interface IStorageConfig {
    readonly type: TStorageType;
    readonly multerMode: TMulterMode;
    readonly bucket?: string;
    readonly bucketType?: TBucketType;
    readonly accessKey?: string;
    readonly secretKey?: string;
    readonly region?: string;
    readonly endpoint?: string;
}

interface IAppConfig {
    readonly env: string;
    readonly protocol: string;
    readonly host: string;
    readonly domain: string;
    readonly clientPort: number;
    readonly serverPort: number;
    readonly jwt: {
        readonly accessSecretKey: string;
        readonly refreshSecretKey: string;
    };
    readonly adminRegCode: string;
    readonly database: {
        readonly mode: TMongoMode;
        readonly uri: string;

    };
    readonly storage: IStorageConfig;
    readonly yooKassa: {
        readonly shopId: string;
        readonly secretKey: string;
    };
}

/////////////////
/// FUNCTIONS ///
/////////////////

const resolveDatabaseConfig = (): IDatabaseConfig => {
    const mode = process.env.MONGO_MODE;

    switch (mode) {
        case MONGO_MODE.LOCAL:
            const localUri = process.env.MONGO_URI_LOCAL;
            if (!localUri) throw new Error('MONGO_URI_LOCAL не задан в переменных окружения');
            return { mode, uri: localUri };

        case MONGO_MODE.ATLAS:
            const atlasUri = process.env.MONGO_URI_ATLAS;
            if (!atlasUri) throw new Error('MONGO_URI_ATLAS не задан в переменных окружения');
            return { mode, uri: atlasUri };

        default:
            throw new Error(`Некорректный режим MongoDB: ${mode}`);
    }
};

const resolveStorageConfig = (): IStorageConfig => {
    const type = process.env.STORAGE_TYPE;

    switch (type) {
        case STORAGE_TYPE.FS:
            return {
                type: STORAGE_TYPE.FS,
                multerMode: MULTER_MODE.DISK
            };

        case STORAGE_TYPE.S3: {
            const {
                STORAGE_S3_BUCKET,
                STORAGE_S3_BUCKET_TYPE,
                STORAGE_S3_ACCESS_KEY,
                STORAGE_S3_SECRET_KEY,
                STORAGE_S3_REGION,
                STORAGE_S3_ENDPOINT
            } = process.env;
    
            if (
                !STORAGE_S3_BUCKET ||
                !STORAGE_S3_BUCKET_TYPE ||
                !STORAGE_S3_ACCESS_KEY ||
                !STORAGE_S3_SECRET_KEY ||
                !STORAGE_S3_REGION ||
                !STORAGE_S3_ENDPOINT
            ) {
                throw new Error('S3 storage выбран, но переменные окружения заданы не полностью');
            }
        
            return {
                type: STORAGE_TYPE.S3,
                multerMode: MULTER_MODE.MEMORY,
                bucket: STORAGE_S3_BUCKET!,
                bucketType: STORAGE_S3_BUCKET_TYPE!,
                accessKey: STORAGE_S3_ACCESS_KEY!,
                secretKey: STORAGE_S3_SECRET_KEY!,
                region: STORAGE_S3_REGION!,
                endpoint: STORAGE_S3_ENDPOINT!
            };
        }

        default:
            throw new Error(`Неизвестный тип файлового хранилища: ${type}`);
    }
};

const config: IAppConfig = {
    env: environment,
    protocol: process.env.PROTOCOL || 'http',
    host: process.env.HOST || 'localhost',
    domain: process.env.DOMAIN || 'localhost',
    clientPort: Number(process.env.CLIENT_PORT) || 3000,
    serverPort: Number(process.env.PORT || process.env.SERVER_PORT) || 3001,
    jwt: {
        accessSecretKey: process.env.JWT_ACCESS_SECRET_KEY,
        refreshSecretKey: process.env.JWT_REFRESH_SECRET_KEY,
    },
    adminRegCode: process.env.ADMIN_REG_CODE,
    database: resolveDatabaseConfig(),
    storage: resolveStorageConfig(),
    yooKassa: {
        shopId: process.env.YOOKASSA_SHOP_ID,
        secretKey: process.env.YOOKASSA_SECRET_KEY
    }
};

export default config;
