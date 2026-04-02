import type { TDbOrderFinalItem } from '@server/types/index.js';

export interface TStorageProvider {
    initStorage: () => Promise<void>;
    deleteTempFiles: (tempFiles: Express.Multer.File[], reqCtx: string) => Promise<void>;
    savePromoImage: (promoId: string, tempFile: Express.Multer.File) => Promise<void>;
    deletePromoImage: (promoId: string, filename: string, reqCtx: string) => Promise<void>;
    cleanupPromoFiles: (promoId: string, reqCtx: string) => Promise<void>;
    saveProductImages: (productId: string, tempFiles: Express.Multer.File[]) => Promise<void>;
    deleteProductImages: (productId: string, filenames: string[], reqCtx: string) => Promise<void>;
    cleanupProductFiles: (productId: string, reqCtx: string) => Promise<void>;
    saveOrderItemsImages: (orderId: string, orderItems: TDbOrderFinalItem[]) => Promise<void>;
    deleteOrderItemsImages: (orderId: string, filenames: string[], reqCtx: string) => Promise<void>;
    cleanupOrderFiles: (orderId: string, reqCtx: string) => Promise<void>;
}
