import type {
    TEmptyResponse,
    TAuthErrorResponse,
    TValidationErrorResponse,
    TGeneralErrorResponse,
    TSuccessResponse
} from './apiResponse.types.js';
import type {
    IBaseQuery,
    TInferFilterQuery,
    TCustomersSortOption,
    TCustomersFilterOption
} from './shared.types.js';

/// Общие типы ///
export interface ICustomer {
    id: string;
    name: string;
    email: string;
    discount: number;
    totalSpent: number;
    createdAt: string;
    isBanned: boolean;
}

/// Загрузка ID всех отфильтрованных клиентов и их данных для одной страницы ///
export type TCustomerListFilterQuery = TInferFilterQuery<TCustomersFilterOption>;
export type TCustomerListQuery = IBaseQuery<TCustomersSortOption['dbField']> & TCustomerListFilterQuery;

interface ICustomerListSuccessData {
    filteredCustomerNamesMap: Record<string, string>;
    paginatedCustomerList: ICustomer[];
}
export type TCustomerListResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<ICustomerListSuccessData>;
