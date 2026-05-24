import type {
    TAuthErrorResponse,
    TFieldErrorResponse,
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

////////////
/// MAIN ///
////////////

export interface ICustomer {
    id: string;
    name: string;
    email: string;
    discount: number;
    totalSpent: number;
    createdAt: string;
    isBanned: boolean;
}

////////////////
/// REQUESTS ///
////////////////

interface ICustomerUpdateSuccessData {
    customerUpdateData: Partial<ICustomer>;
}

/// Загрузка ID отфильтрованных клиентов и их данных для одной страницы таблицы ///
export type TCustomerListFilterParams = TInferFilterParams<TCustomersFilterOption>;
export type TCustomerListQuery = IBaseQuery<TCustomersSortOption['dbField']> & TCustomerListFilterParams;

export type TCustomerListResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<ICustomerListSuccessData>;

interface ICustomerListSuccessData {
    filteredCustomerNamesMap: Record<string, string>;
    paginatedCustomerList: ICustomer[];
}
    
/// Загрузка заказов клиента в таблице ///
export interface ICustomerOrderListQuery {
    firstOrderId?: string;
    skip?: number;
    limit?: number;
}

export type TCustomerOrderListResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<ICustomerOrderListSuccessData>;

interface ICustomerOrderListSuccessData {
    totalCustomerOrders: number;
    customerOrderList: IOrder[];
    needFullReload: boolean;
}
    
/// Изменение скидки клиента ///
export interface ICustomerDiscountUpdateBody {
    discount: number;
}

export type TCustomerDiscountUpdateResponse =
    | TAuthErrorResponse
    | TFieldErrorResponse<'customer'>
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
