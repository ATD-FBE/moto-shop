import type {
    TEmptyResponse,
    TAuthErrorResponse,
    TFieldErrorResponse,
    TGeneralErrorResponse,
    TSuccessResponse
} from './apiResponse.types.js';

/// Общие типы ///
export interface ICategory {
    id: string;
    name: string;
    slug: string;
    order: number;
    parent: string | null;
    restricted: boolean;
}

export interface ICategoryBody {
    name: string;
    slug: string;
    order: number;
    parent: string | null;
}

export interface ICategoryNode extends ICategory {
    subcategories: ICategoryNode[];
}
export type TCategoryTree = ICategoryNode[];
export type TCategoryMap = Record<string, ICategoryNode>;

interface ICategoryBaseSuccessData {
    movedProductsCount: number;
}

/// Загрузка списка категорий ///
export type TCategoryListResponse =
    | TGeneralErrorResponse
    | TSuccessResponse<ICategoryListSuccessData>;

interface ICategoryListSuccessData {
    categoryList: ICategory[];
}

/// Создание категории ///
export type TCategoryCreateResponse =
    | TAuthErrorResponse
    | TFieldErrorResponse<'category'>
    | TGeneralErrorResponse
    | TSuccessResponse<ICategoryCreateSuccessData>;

interface ICategoryCreateSuccessData extends ICategoryBaseSuccessData {
    newCategoryId: string;
}

/// Изменение категории ///
export type TCategoryUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TFieldErrorResponse<'category'>
    | TGeneralErrorResponse
    | TSuccessResponse<ICategoryUpdateSuccessData>;

interface ICategoryUpdateSuccessData extends ICategoryBaseSuccessData {}

/// Удаление категории ///
export type TCategoryDeleteResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<ICategoryBaseSuccessData>;
