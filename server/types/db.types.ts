import { InferSchemaType, HydratedDocument, Schema, Types } from 'mongoose';
import { UpdateHistoryItemSchema } from '@server/db/models/schemas/UpdateHistoryItemSchema.js';
import { CategorySchema } from '@server/db/models/Category.js';
import { CounterSchema } from '@server/db/models/Counter.js';
import { CriticalEventSchema } from '@server/db/models/CriticalEvent.js';
import { NewsSchema } from '@server/db/models/News.js';
import { NotificationSchema } from '@server/db/models/Notification.js';
import { ProductSchema } from '@server/db/models/Product.js';
import { PromoSchema } from '@server/db/models/Promo.js';
import { UserSchema } from '@server/db/models/User.js';
import { BaseOrderSchema, OrderDraftSchema, OrderFinalSchema } from '@server/db/models/Order.js';

// Типизация схем моделей
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
export type TDbOrderDraft = TDbBaseOrder & InferSchemaType<typeof OrderDraftSchema>;
export type TDbOrderFinal = TDbBaseOrder & InferSchemaType<typeof OrderFinalSchema>;
export type TDbOrder = TDbOrderDraft | TDbOrderFinal;

// Типизация подсхем моделей
export type TDbUpdateHistoryItem = InferSchemaType<typeof UpdateHistoryItemSchema>;
export type TDbUserNotificationItem = TDbUser['notifications'][number];
export type TDbCartItem = TDbUser['cart'][number];
export type TDbOrderStatusHistoryEntry = TDbBaseOrder['statusHistory'][number];
export type TDbOrderTotals = TDbBaseOrder['totals'];
export type TDbOrderDraftItem = TDbOrderDraft['items'][number];
export type TDbOrderFinalItem = TDbOrderFinal['items'][number];
export type TDbOrderDraftCustomerInfo = TDbOrderDraft['customerInfo'];
export type TDbOrderFinalCustomerInfo = TDbOrderFinal['customerInfo'];
export type TDbOrderDraftDelivery = TDbOrderDraft['delivery'];
export type TDbOrderFinalDelivery = TDbOrderFinal['delivery'];
export type TDbOrderDraftFinancials = TDbOrderDraft['financials'];
export type TDbOrderFinalFinancials = TDbOrderFinal['financials'];
export type TDbOrderFinancialsEventEntry = TDbOrderFinalFinancials['eventHistory'][number];
export type TDbOrderFinancialsEventVoided = TDbOrderFinancialsEventEntry['voided'];
export type TDbOrderCurrentOnlineTransaction = TDbOrderFinalFinancials['currentOnlineTransaction'];
export type TDbOrderAuditLogEntry = NonNullable<TDbOrderFinal['auditLog']>[number];

// Типизация схем моделей как документов (с методами и другими встроенными данными)
export type TDbCriticalEventDoc = HydratedDocument<TDbCriticalEvent>;
export type TDbCounterDoc = HydratedDocument<TDbCounter>;
export type TDbUserDoc = HydratedDocument<TDbUser>;
export type TDbNewsDoc = HydratedDocument<TDbNews>;
export type TDbPromoDoc = HydratedDocument<TDbPromo>;
export type TDbNotificationDoc = HydratedDocument<TDbNotification>;
export type TDbCategoryDoc = HydratedDocument<TDbCategory>;
export type TDbProductDoc = HydratedDocument<TDbProduct>;
export type TDbOrderDraftDoc = HydratedDocument<TDbOrderDraft>;
export type TDbOrderFinalDoc = HydratedDocument<TDbOrderFinal>;
export type TDbOrderDoc = HydratedDocument<TDbOrder>;

// Расширения типов моделей
export type TDbNotificationExtended = TDbNotification & {
    isRead?: boolean;
    readAt?: Date | null;
};
