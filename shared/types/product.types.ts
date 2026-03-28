import type { TProductThumbnailKey } from '@shared/types/index.js';

export type TProductImageThumbs = {
    [K in TProductThumbnailKey]: string;
}

export interface IProductImage {
    filename: string;
    original: string;
    thumbnails: TProductImageThumbs;
}

export interface IProduct {
    id: string;
    images: IProductImage[];
    mainImageIndex?: number | null;
    sku?: string | null;
    name: string;
    brand?: string | null;
    description?: string | null;
    available: number;
    isBrandNew: boolean;
    isRestocked: boolean;
    unit: string;
    price: number;
    discount: number;
    isActive: boolean;
    stock?: number;
    reserved?: number;
    category?: string;
    tags?: string;
}

export interface ICartProductSnapshot {
    id: string;
    name: string;
    brand?: string | null;
}

export type TCartProduct = IProduct | ICartProductSnapshot;
