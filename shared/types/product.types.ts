import type {
    TEmptyResponse,
    TAuthErrorResponse,
    TFieldErrorResponse,
    TGeneralErrorResponse,
    TSuccessResponse
} from './apiResponse.types.js';
import type {
    TProductThumbnailKey,
    TProductsPageContext,
    IBaseQuery,
    TInferFilterParams,
    TProductCatalogSortOption,
    TProductEditorSortOption,
    TProductsFilterOption,
    TProductUnit,
    TDiscountSource
} from './shared.types.js';

/// Общие типы ///
export interface IProduct {
    _type: 'full';
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
    unit: TProductUnit;
    price: number;
    discount: number;
    isActive: boolean;
    stock?: number;
    reserved?: number;
    category?: string;
    tags?: string;
}

export type TProductSnapshot = Pick<IProduct, 'name' | 'brand'> & {
    _type: 'snapshot';
};

export interface IProductImage {
    filename: string;
    original: string;
    thumbnails: TProductImageThumbs;
}

export type TProductImageThumbs = {
    [K in TProductThumbnailKey]: string;
}

export interface IProductAdjustment {
    id: string;
    name?: string;
    brand?: string;
    adjustments: {
        deleted?: boolean;
        inactive?: boolean;
        outOfStock?: boolean;
        quantityReduced?: {
            old: number;
            corrected: number;
        };
        price?: {
            old: number;
            corrected: number;
        };
        discount?: {
            old: number;
            corrected: number;
            source: TDiscountSource;
        };
    };
}

interface IProductCreateBodyBase<TFile> {
    images: TFile[];
    mainImageIndex?: number;
    sku?: string;
    name: string;
    brand?: string;
    description?: string;
    stock: number;
    unit: TProductUnit;
    price: number;
    discount: number;
    category: string;
    tags?: string;
    isActive: boolean;
}

interface IProductUpdateBodyBase<TFile> extends IProductCreateBodyBase<TFile> {
    imageFilenamesToDelete: string[];
}

/// Загрузка ID отфильтрованных товаров и их данных для одной страницы ///
export type TProductListFilterParams = TInferFilterParams<TProductsFilterOption>;
export type TProductListQuery =
    IBaseQuery<TProductCatalogSortOption['dbField'] | TProductEditorSortOption['dbField']> &
    TProductListFilterParams & {
        pageContext?: TProductsPageContext;
        category?: string;
    };

export type TProductListResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<IProductListSuccessData>;

interface IProductListSuccessData {
    filteredProductIdList?: string[];
    productsCount?: number;
    paginatedProductList: IProduct[];
}
    
/// Загрузка отдельного товара на его странице ///
export type TProductResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<IProductSuccessData>;

interface IProductSuccessData {
    product: IProduct;
}
    
/// Создание товара ///
export type TProductCreateBodyServer = IProductCreateBodyBase<Express.Multer.File>;
export type TProductCreateBodyClient = IProductCreateBodyBase<File>;

export type TProductCreateResponse =
    | TAuthErrorResponse
    | TFieldErrorResponse<'product'>
    | TGeneralErrorResponse
    | TSuccessResponse<IProductCreateSuccessData>;

interface IProductCreateSuccessData {
    newProduct: IProduct;
}

/// Изменение товара ///
export type TProductUpdateBodyServer = IProductUpdateBodyBase<Express.Multer.File>;
export type TProductUpdateBodyClient = IProductUpdateBodyBase<File>;

export type TProductUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TFieldErrorResponse<'product'>
    | TGeneralErrorResponse
    | TSuccessResponse<IProductUpdateSuccessData>;

interface IProductUpdateSuccessData {
    updatedProduct: IProduct;
}

/// Изменение группы товаров ///
export interface IBulkProductUpdateBody {
    productIds: string[];
    formFields: {
        brand?: string | null;
        unit?: TProductUnit;
        discount?: number;
        category?: string;
        tags?: string | null;
        isActive?: boolean;
    };
}

export type TBulkProductUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TFieldErrorResponse<'product'>
    | TGeneralErrorResponse
    | TSuccessResponse<IBulkProductUpdateSuccessData>;

interface IBulkProductUpdateSuccessData {
    updatedProducts: IProduct[];
}
    
/// Удаление товара ///
export type TProductDeleteResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse;
    
/// Удаление группы товаров ///
export interface IBulkProductDeleteBody {
    productIds: string[];
}

export type TBulkProductDeleteResponse =
    | TAuthErrorResponse
    | TFieldErrorResponse<'product'>
    | TGeneralErrorResponse
    | TSuccessResponse;
