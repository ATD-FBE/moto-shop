import type { TActiveUserRole, IProduct, IProductSnapshot, ICartItem } from '@shared/types/index.js';

export interface IUser {
    name: string;
    email: string;
    role: TActiveUserRole;
    unreadNotificationsCount?: number;
    discount?: number;
    managedActiveOrdersCount?: number;
}

export interface ISession {
    user: IUser;
    purchaseProductList?: (IProduct | IProductSnapshot)[];
    cartItemList?: ICartItem[];
    cartWasMerged?: boolean;
    orderDraftId?: string | null;
}
