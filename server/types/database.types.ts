import { InferSchemaType, HydratedDocument, Schema, Types } from 'mongoose';
import { UpdateHistoryItemSchema } from '@server/database/models/schemas/UpdateHistoryItemSchema.js';
import { CategorySchema } from '@server/database/models/Category.js';
import { CounterSchema } from '@server/database/models/Counter.js';
import { CriticalEventSchema } from '@server/database/models/CriticalEvent.js';
import { NewsSchema } from '@server/database/models/News.js';
import { NotificationSchema } from '@server/database/models/Notification.js';
import { ProductSchema } from '@server/database/models/Product.js';
import { PromoSchema } from '@server/database/models/Promo.js';
import { UserSchema } from '@server/database/models/User.js';
import { BaseOrderSchema, DraftOrderSchema, FinalOrderSchema } from '@server/database/models/Order.js';

/// Типизация схем моделей ///
type TBaseDocument<T extends Schema> = InferSchemaType<T> & {
    _id: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
};

export type TDbCriticalEvent = TBaseDocument<typeof CriticalEventSchema>;
export type TDbCounter = TBaseDocument<typeof CounterSchema>;
export type TDbUser = TBaseDocument<typeof UserSchema>;
export type TDbNews = TBaseDocument<typeof NewsSchema>;
export type TDbPromo = TBaseDocument<typeof PromoSchema>;
export type TDbNotification = TBaseDocument<typeof NotificationSchema>;
export type TDbCategory = TBaseDocument<typeof CategorySchema>;
export type TDbProduct = TBaseDocument<typeof ProductSchema>;

export type TDbBaseOrder = TBaseDocument<typeof BaseOrderSchema>;
export type TDbDraftOrder = TDbBaseOrder & InferSchemaType<typeof DraftOrderSchema>;
export type TDbFinalOrder = TDbBaseOrder & InferSchemaType<typeof FinalOrderSchema>;
export type TDbOrder = TDbDraftOrder | TDbFinalOrder;

/// Типизация подсхем моделей ///
export type TDbUpdateHistoryItem = InferSchemaType<typeof UpdateHistoryItemSchema>;
export type TDbUserNotificationItem = TDbUser['notifications'][number];
export type TDbCartItem = TDbUser['cart'][number];
export type TDbOrderStatusHistoryEntry = TDbBaseOrder['statusHistory'][number];
export type TDbOrderTotals = TDbBaseOrder['totals'];
export type TDbOrderDraftItem = TDbDraftOrder['items'][number];
export type TDbOrderFinalItem = TDbFinalOrder['items'][number];
export type TDbOrderDraftCustomerInfo = TDbDraftOrder['customerInfo'];
export type TDbOrderFinalCustomerInfo = TDbFinalOrder['customerInfo'];
export type TDbOrderDraftDelivery = TDbDraftOrder['delivery'];
export type TDbOrderFinalDelivery = TDbFinalOrder['delivery'];
export type TDbOrderDraftFinancials = TDbDraftOrder['financials'];
export type TDbOrderFinalFinancials = TDbFinalOrder['financials'];
export type TDbOrderFinancialsEventEntry = TDbOrderFinalFinancials['eventHistory'][number];
export type TDbOrderFinancialsEventVoided = TDbOrderFinancialsEventEntry['voided'];
export type TDbOrderCurrentOnlineTransaction = TDbOrderFinalFinancials['currentOnlineTransaction'];
export type TDbOrderAuditLogEntry = NonNullable<TDbFinalOrder['auditLog']>[number];

/// Типизация схем моделей как документов (с методами и другими встроенными данными) ///
export type TDbCriticalEventDoc = HydratedDocument<TDbCriticalEvent>;
export type TDbCounterDoc = HydratedDocument<TDbCounter>;
export type TDbUserDoc = HydratedDocument<TDbUser>;
export type TDbNewsDoc = HydratedDocument<TDbNews>;
export type TDbPromoDoc = HydratedDocument<TDbPromo>;
export type TDbNotificationDoc = HydratedDocument<TDbNotification>;
export type TDbCategoryDoc = HydratedDocument<TDbCategory>;
export type TDbProductDoc = HydratedDocument<TDbProduct>;
export type TDbDraftOrderDoc = HydratedDocument<TDbDraftOrder>;
export type TDbFinalOrderDoc = HydratedDocument<TDbFinalOrder>;
export type TDbOrderDoc = HydratedDocument<TDbOrder>;

/// Изменение типа полей при заполнении (вызове populated) ///
type TPopulated<T, Keys extends keyof T, TReplacement> = Omit<T, Keys> & {
    [K in Keys]: TReplacement;
};

export type TDbUpdateHistoryItemPopulated = TPopulated<TDbUpdateHistoryItem, 'updatedBy', { name: string }>;
export type TDbNewsPopulated = TPopulated<TDbNews, 'createdBy', { _id: Types.ObjectId, name: string }> & {
    updateHistory: TDbUpdateHistoryItemPopulated[];
};
export type TDbPromoPopulated = TPopulated<TDbPromo, 'createdBy', { _id: Types.ObjectId, name: string }> & {
    updateHistory: TDbUpdateHistoryItemPopulated[];
};
export type TDbNotificationPopulated = TPopulated<
    TDbNotification,
    'createdBy',
    { _id: Types.ObjectId, name: string }
> & {
    updateHistory: TDbUpdateHistoryItemPopulated[];
};
export type TDbFinalOrderPopulated = TPopulated<
    TDbFinalOrder,
    'customerId',
    { _id: Types.ObjectId, name: string, email: string }
>;
