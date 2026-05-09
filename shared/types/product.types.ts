import type {
    TEmptyResponse,
    TAuthErrorResponse,
    TFormFieldsErrorResponse,
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
    unit: TProductUnit;
    price: number;
    discount: number;
    isActive: boolean;
    stock?: number;
    reserved?: number;
    category?: string;
    tags?: string;
}

export interface IProductImage {
    filename: string;
    original: string;
    thumbnails: TProductImageThumbs;
}

export type TProductImageThumbs = {
    [K in TProductThumbnailKey]: string;
}

export interface IProductSnapshot {
    name: string;
    brand?: string;
}

export type TTradeProduct = IProduct | IProductSnapshot;

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

interface IProductListSuccessData {
    filteredProductIdList?: string[];
    productsCount?: number;
    paginatedProductList: IProduct[];
}
export type TProductListResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<IProductListSuccessData>;
    
/// Загрузка отдельного товара на его странице ///
interface IProductSuccessData {
    product: IProduct;
}
export type TProductResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<IProductSuccessData>;
    
/// Создание товара ///
export type TProductCreateBodyServer = IProductCreateBodyBase<Express.Multer.File>;
export type TProductCreateBodyClient = IProductCreateBodyBase<File>;

interface IProductCreateSuccessData {
    newProduct: IProduct;
}
export type TProductCreateResponse =
    | TAuthErrorResponse
    | TFormFieldsErrorResponse<'product'>
    | TGeneralErrorResponse
    | TSuccessResponse<IProductCreateSuccessData>;

/// Изменение товара ///
export type TProductUpdateBodyServer = IProductUpdateBodyBase<Express.Multer.File>;
export type TProductUpdateBodyClient = IProductUpdateBodyBase<File>;

interface IProductUpdateSuccessData {
    updatedProduct: IProduct;
}
export type TProductUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TFormFieldsErrorResponse<'product'>
    | TGeneralErrorResponse
    | TSuccessResponse<IProductUpdateSuccessData>;

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

interface IBulkProductUpdateSuccessData {
    updatedProducts: IProduct[];
}
export type TBulkProductUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TFormFieldsErrorResponse<'product'>
    | TGeneralErrorResponse
    | TSuccessResponse<IBulkProductUpdateSuccessData>;
    
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
    | TFormFieldsErrorResponse<'product'>
    | TGeneralErrorResponse
    | TSuccessResponse;
