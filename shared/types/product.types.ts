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
    TProductFilterOptionConfig
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

interface IProductBodyBase<TFile> {
    images?: TFile[];
    
}
export type TProductBodyServer = IProductBodyBase<Express.Multer.File>;
export type TProductBodyClient = IProductBodyBase<File>;

/// Загрузка ID отфильтрованных товаров и их данных для одной страницы ///
export type TProductListFilterParams = TInferFilterParams<TProductFilterOptionConfig>;
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
export type TProductCreateResponse =
    | TAuthErrorResponse
    | TFormFieldsErrorResponse<'product'>
    | TGeneralErrorResponse
    | TSuccessResponse;
