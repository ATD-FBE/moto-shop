import type {
    TEmptyResponse,
    TAuthErrorResponse,
    TFormFieldsErrorResponse,
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
interface ICategoryListSuccessData {
    categoryList: ICategory[];
}
export type TCategoryListResponse =
    | TGeneralErrorResponse
    | TSuccessResponse<ICategoryListSuccessData>;

/// Создание категории ///
interface ICategoryCreateSuccessData extends ICategoryBaseSuccessData {
    newCategoryId: string;
}
export type TCategoryCreateResponse =
    | TAuthErrorResponse
    | TFormFieldsErrorResponse<'category'>
    | TGeneralErrorResponse
    | TSuccessResponse<ICategoryCreateSuccessData>;
    
/// Изменение категории ///
interface ICategoryUpdateSuccessData extends ICategoryBaseSuccessData {}
export type TCategoryUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TFormFieldsErrorResponse<'category'>
    | TGeneralErrorResponse
    | TSuccessResponse<ICategoryUpdateSuccessData>;
    
/// Удаление категории ///
export type TCategoryDeleteResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<ICategoryBaseSuccessData>;
