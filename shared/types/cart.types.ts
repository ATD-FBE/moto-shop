import type {
    TAuthErrorResponse,
    TGeneralErrorResponse,
    TSuccessResponse
} from './apiResponse.types.js';
import type { IProduct, TProductSnapshot } from './product.types.js';

////////////
/// MAIN ///
////////////

export interface IBaseCartItem {
    id: string;
    quantity: number;
}

export interface IGuestCartItem extends IBaseCartItem {}

export interface ICartItem {
    id: string;
    quantity: number;
    quantityReduced: boolean;
    outOfStock: boolean;
    inactive: boolean;
    deleted: boolean;
    productSnapshot: TProductSnapshot | null;
}

interface ICartSuccessData {
    tradeProductList: IProduct[];
    cartItemList: ICartItem[];
    customerDiscount: number;
}

////////////////
/// REQUESTS ///
////////////////

/// Синхронизация гостевой корзины ///
export interface IGuestCartItemListBody {
    guestCart: IGuestCartItem[];
}

export type TGuestCartItemListResponse =
    | TGeneralErrorResponse
    | TSuccessResponse<IGuestCartItemListSuccessData>;

interface IGuestCartItemListSuccessData {
    tradeProductList: IProduct[];
    cartItemList: IGuestCartItem[];
}
    
/// Загрузка серверной корзины ///
export type TCartItemListResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<ICartSuccessData>;
    
/// Добавление/изменение количества/удаление товара в корзине ///
export interface ICartItemUpdateBody {
    quantity: number;
}

export type TCartItemUpdateResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse;
    
/// Восстановление товара в корзине ///
export interface ICartItemRestoreBody {
    quantity: number;
    position: number;
}

export type TCartItemRestoreResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse;
    
/// Исправление всех проблемных товаров в корзине ///
export type TCartWarningsFixResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse<ICartSuccessData>;
    
/// Удаление товара из корзины ///
export type TCartItemRemoveResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse;

/// Очистка корзины ///
export type TCartClearResponse =
    | TAuthErrorResponse
    | TGeneralErrorResponse
    | TSuccessResponse;
