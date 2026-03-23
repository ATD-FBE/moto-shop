import { S3Client, S3ClientConfig } from '@aws-sdk/client-s3';
import config from './config.js';
import { STORAGE_TYPE } from '@server/config/constants.js';

let s3Client: S3Client | null = null; // Инициализация только для S3

if (config.storage.type === STORAGE_TYPE.S3) {
    const s3Config: S3ClientConfig = {
        region: config.storage.region,
        endpoint: config.storage.endpoint,
        credentials: {
            accessKeyId: config.storage.accessKey,
            secretAccessKey: config.storage.secretKey
        },
        forcePathStyle: true // Для путей в Backblaze
    };

    s3Client = new S3Client(s3Config);
}

export default s3Client;
