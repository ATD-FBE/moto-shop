import type { TProductThumbnailKey } from './shared.types.js';

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
    mainImageIndex?: number;
    sku?: string;
    name: string;
    brand?: string;
    description?: string;
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

export interface IProductSnapshot {
    id: string;
    name: string;
    brand?: string | null;
}

export type TPurchaseProduct = IProduct | IProductSnapshot;
