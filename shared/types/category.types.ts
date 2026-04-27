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

export type TCategoryMap = Record<string, ICategory & {
    parent?: string | null;
    subcategories: ICategory[];
    [key: string]: any;
}>;

interface ICategoryBaseSuccessData {
    movedProductCount: number;
}

/// Загрузка всех категорий ///
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
export type TCategoryUpdateResponse =
    | TEmptyResponse
    | TAuthErrorResponse
    | TFormFieldsErrorResponse<'category'>
    | TGeneralErrorResponse
    | TSuccessResponse<ICategoryBaseSuccessData>;
    
/// Удаление категории ///
export type TCategoryDeleteResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<ICategoryBaseSuccessData>;
