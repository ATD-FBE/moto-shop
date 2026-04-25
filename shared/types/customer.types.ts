import type {
    TAuthErrorResponse,
    TFormFieldsErrorResponse,
    TGeneralErrorResponse,
    TSuccessResponse
} from './apiResponse.types.js';
import type { IOrder } from './order.types.js';
import type {
    IBaseQuery,
    TInferFilterParams,
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

interface ICustomerUpdateSuccessData {
    customerUpdateData: Partial<ICustomer>;
}

/// Загрузка ID всех отфильтрованных клиентов и их данных для одной страницы ///
export type TCustomerListFilterParams = TInferFilterParams<TCustomersFilterOption>;
export type TCustomerListQuery = IBaseQuery<TCustomersSortOption['dbField']> & TCustomerListFilterParams;

interface ICustomerListSuccessData {
    filteredCustomerNamesMap: Record<string, string>;
    paginatedCustomerList: ICustomer[];
}
export type TCustomerListResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<ICustomerListSuccessData>;
    
/// Загрузка заказов клиента в таблице ///
export interface ICustomerOrderListQuery {
    firstOrderId?: string;
    skip?: string;
    limit?: string;
}

interface ICustomerOrderListSuccessData {
    totalCustomerOrders: number;
    customerOrderList: IOrder[];
    needFullReload: boolean;
}
export type TCustomerOrderListResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<ICustomerOrderListSuccessData>;
    
/// Изменение скидки клиента ///
export interface ICustomerDiscountUpdateBody {
    discount: number;
}

export type TCustomerDiscountUpdateResponse =
    | TAuthErrorResponse
    | TFormFieldsErrorResponse<'customer'>
    | TGeneralErrorResponse
    | TSuccessResponse<ICustomerUpdateSuccessData>;
    
/// Изменение статуса блокировки клиента ///
export interface ICustomerBanStatusUpdateBody {
    newBanStatus: boolean;
}

export type TCustomerBanStatusUpdateResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<ICustomerUpdateSuccessData>;
