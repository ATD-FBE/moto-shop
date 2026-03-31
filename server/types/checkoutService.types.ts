import type { TDbCartItem, TDbOrderDraftItem } from './db.types.js';
import type { IOrderAdjustments, IOrderDraftItem, IProduct, ICartItem } from '@shared/types/index.js';

export interface ISyncCartResult {
    fixedDbCart: TDbCartItem[];
    fixedDbOrderItems: TDbOrderDraftItem[];
    orderAdjustments: IOrderAdjustments[];
    purchaseProductList: IProduct[];
    cartItemList: ICartItem[];
}

export interface ISyncOrderDraftResult {
    fixedDbCart: TDbCartItem[];
    fixedDbOrderItems: TDbOrderDraftItem[];
    orderItemList: IOrderDraftItem[];
    orderAdjustments: IOrderAdjustments[];
    purchaseProductList: IProduct[];
    cartItemList: ICartItem[];
}
