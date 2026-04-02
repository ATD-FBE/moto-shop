import config from '@server/config/config.js';
import { fsStorageProvider } from './providers/fs.provider.js';
import { s3StorageProvider } from './providers/s3.provider.js';
import { STORAGE_TYPE } from '@server/config/constants.js';
import type { TStorageProvider } from '@server/types/index.js';

const storageType = config.storage.type;
let provider: TStorageProvider;

switch (storageType) {
    case STORAGE_TYPE.FS:
        provider = fsStorageProvider;
        break;
    case STORAGE_TYPE.S3:
        provider = s3StorageProvider;
        break;
    default:
        throw new Error(`Неизвестный тип файлового хранилища: ${storageType}`);
}

export const storageService: TStorageProvider = {
    initStorage: provider.initStorage,
    deleteTempFiles: provider.deleteTempFiles,

    savePromoImage: provider.savePromoImage,
    deletePromoImage: provider.deletePromoImage,
    cleanupPromoFiles: provider.cleanupPromoFiles,

    saveProductImages: provider.saveProductImages,
    deleteProductImages: provider.deleteProductImages,
    cleanupProductFiles: provider.cleanupProductFiles,

    saveOrderItemsImages: provider.saveOrderItemsImages,
    deleteOrderItemsImages: provider.deleteOrderItemsImages,
    cleanupOrderFiles: provider.cleanupOrderFiles
} as const;
