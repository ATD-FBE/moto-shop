import type { TDbCartItem } from '@server/types/index.js';
import type {
    IProduct,
    IProductSnapshot,
    IGuestCartItem,
    ICartItem
} from '@shared/types/index.js';

export interface IGuestCart {
    purchaseProductList: IProduct[];
    cartItemList: IGuestCartItem[];
}

export interface ICart {
    purchaseProductList: (IProduct | IProductSnapshot)[];
    cartItemList: ICartItem[];
}

export interface IFixedDbCart {
    fixedDbCart: TDbCartItem[];
    purchaseProductList: IProduct[];
    cartItemList: ICartItem[];
}
