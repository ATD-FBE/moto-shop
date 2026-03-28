import type { TDbCartItem } from '@server/types/index.js';
import type {
    IProduct,
    TCartProduct,
    IGuestCartItem,
    ICartItem
} from '@shared/types/index.js';

export interface IGuestCart {
    purchaseProductList: IProduct[];
    cartItemList: IGuestCartItem[];
}

export interface ICart {
    purchaseProductList: TCartProduct[];
    cartItemList: ICartItem[];
}

export interface IFixedDbCart {
    fixedDbCart: TDbCartItem[];
    purchaseProductList: IProduct[];
    cartItemList: ICartItem[];
}
