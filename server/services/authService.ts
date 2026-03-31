import Order from '@server/db/models/Order.js';
import {
    prepareDbGuestCart,
    mergeCarts,
    areCartsDifferent,
    prepareCart
} from '@server/services/cartService.js';
import { USER_ROLE, ORDER_STATUS, ORDER_ACTIVE_STATUSES } from '@shared/constants.js';
import type { TDbUser, TDbUserDoc, IUser, TDbOrderDraft, ISession } from '@server/types/index.js';
import type { IGuestCartItem } from '@shared/types/index.js';

export const prepareUser = async (dbUser: TDbUser): Promise<IUser> => {
    const baseUserData = {
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role
    };

    if (dbUser.role === USER_ROLE.CUSTOMER) {
        return {
            ...baseUserData,
            unreadNotificationsCount: dbUser.notifications.filter(n => !n.isRead).length,
            discount: dbUser.discount
        };
    }

    if (dbUser.role === USER_ROLE.ADMIN) {
        const managedActiveOrdersCount = await Order.countDocuments({
            currentStatus: { $in: ORDER_ACTIVE_STATUSES }
        });
        
        return {
            ...baseUserData,
            managedActiveOrdersCount
        };
    }

    throw new Error(`Неизвестная роль пользователя: ${dbUser.role}`);
};

export const prepareSession = async (dbUser: TDbUserDoc, guestCart: IGuestCartItem[]): Promise<ISession> => {
    // Данные пользователя
    const user = await prepareUser(dbUser);

    if (dbUser.role !== USER_ROLE.CUSTOMER) {
        return { user };
    }

    // При регистрации поля _id и cart в dbUser ещё отсутствуют
    // Активный черновик заказа
    const orderDraft: TDbOrderDraft | null = dbUser._id
        ? await Order.findOne({ customerId: dbUser._id, currentStatus: ORDER_STATUS.DRAFT }, { _id: 1 })
        : null;
    const orderDraftId = orderDraft ? orderDraft._id.toString() : null;

    /// Объединение товаров гостевой и серверной корзин, если нет начатого заказа ///
    let cartWasMerged: boolean = false;

    if (guestCart.length > 0 && !orderDraftId) {
        const dbGuestCart = await prepareDbGuestCart(guestCart);
        const mergedCart = mergeCarts(dbUser.cart ?? [], dbGuestCart);
        const cartsAreDifferent = areCartsDifferent(dbUser.cart ?? [], mergedCart);
        
        if (cartsAreDifferent) {
            dbUser.set('cart', mergedCart);
            cartWasMerged = true;
        }
    }

    // Данные корзины
    const { purchaseProductList, cartItemList } = await prepareCart(dbUser.cart ?? [], {
        checkoutMode: Boolean(orderDraft)
    });

    return { user, purchaseProductList, cartItemList, cartWasMerged, orderDraftId };
};
