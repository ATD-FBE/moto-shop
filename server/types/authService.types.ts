import type { TActiveUserRole, TCartProduct, ICartItem } from '@shared/types/index.js';

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
    purchaseProductList?: TCartProduct[];
    cartItemList?: ICartItem[];
    cartWasMerged?: boolean;
    orderDraftId?: string | null;
}
