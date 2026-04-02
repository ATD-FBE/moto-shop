import { MONGO_MODE, STORAGE_TYPE, MULTER_MODE } from '@server/config/constants.js';

export type TStorageType = typeof STORAGE_TYPE[keyof typeof STORAGE_TYPE];

export type TMulterMode = typeof MULTER_MODE[keyof typeof MULTER_MODE];

export type TMongoMode = typeof MONGO_MODE[keyof typeof MONGO_MODE];

export type TBucketType = 'public' | 'private';

export interface IDatabaseConfig {
    readonly mode: TMongoMode;
    readonly uri: string;
}

export interface IAppConfig {
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
    readonly storage: TStorageConfig;
    readonly yooKassa: {
        readonly shopId: string;
        readonly secretKey: string;
    };
}

export type TStorageConfig = IFSStorageConfig | IS3StorageConfig;
interface IFSStorageConfig {
    readonly type: typeof STORAGE_TYPE.FS;
    readonly multerMode: typeof MULTER_MODE.DISK;
}
interface IS3StorageConfig {
    readonly type: typeof STORAGE_TYPE.S3;
    readonly multerMode: typeof MULTER_MODE.MEMORY;
    readonly bucket: string;
    readonly bucketType: TBucketType;
    readonly accessKey: string;
    readonly secretKey: string;
    readonly region: string;
    readonly endpoint: string;
}
