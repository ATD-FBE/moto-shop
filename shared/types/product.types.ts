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
    TProductsSortOption,
    TProductEditorSortOption,
    TProductsFilterOption,
    TProductUnit
} from './shared.types.js';

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
    unit: TProductUnit;
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
    IBaseQuery<TProductsSortOption['dbField'] | TProductEditorSortOption['dbField']> &
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
        brand?: string;
        unit?: TProductUnit;
        discount?: number;
        category?: string;
        tags?: string;
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
