import { InferSchemaType, HydratedDocument, Schema, Types } from 'mongoose';
import { UpdateHistoryItemSchema } from '@server/db/models/schemas/UpdateHistoryItemSchema.js';
import { NotificationItemSchema } from '@server/db/models/schemas/user/NotificationItemSchema.js';
import { CartItemSchema } from '@server/db/models/schemas/user/CartItemSchema.js';
import { StatusHistoryEntrySchema } from '@server/db/models/schemas/order/StatusHistoryEntrySchema.js';
import { TotalsSchema } from '@server/db/models/schemas/order/TotalsSchema.js';
import {
    DraftItemSchema,
    FinalItemSchema
} from '@server/db/models/schemas/order/ItemSchemas.js';
import {
    DraftCustomerInfoSchema,
    FinalCustomerInfoSchema
} from '@server/db/models/schemas/order/CustomerInfoSchemas.js';
import {
    DraftDeliverySchema,
    FinalDeliverySchema
} from '@server/db/models/schemas/order/DeliverySchemas.js';
import {
    DraftFinancialsSchema,
    FinalFinancialsSchema
} from '@server/db/models/schemas/order/FinancialsSchemas.js';
import { AuditLogSchema } from '@server/db/models/schemas/order/AuditLogSchema.js';
import { EventEntrySchema } from '@server/db/models/schemas/order/financials/EventEntrySchema.js';
import { EventVoidedSchema } from '@server/db/models/schemas/order/financials/EventVoidedSchema.js';
import {
    CurrentOnlineTransactionSchema
} from '@server/db/models/schemas/order/financials/CurrentOnlineTransactionSchema.js';
import { CategorySchema } from '@server/db/models/Category.js';
import { CounterSchema } from '@server/db/models/Counter.js';
import { CriticalEventSchema } from '@server/db/models/CriticalEvent.js';
import { NewsSchema } from '@server/db/models/News.js';
import { NotificationSchema } from '@server/db/models/Notification.js';
import { ProductSchema } from '@server/db/models/Product.js';
import { PromoSchema } from '@server/db/models/Promo.js';
import { UserSchema } from '@server/db/models/User.js';
import { BaseOrderSchema, OrderDraftSchema, OrderFinalSchema } from '@server/db/models/Order.js';

// Типизация подсхем моделей
export type TDbUpdateHistoryItem = InferSchemaType<typeof UpdateHistoryItemSchema>;
export type TDbUserNotificationItem = InferSchemaType<typeof NotificationItemSchema>;
export type TDbCartItem = InferSchemaType<typeof CartItemSchema>;
export type TDbOrderStatusHistoryEntry = InferSchemaType<typeof StatusHistoryEntrySchema>;
export type TDbOrderTotals = InferSchemaType<typeof TotalsSchema>;
export type TDbOrderDraftItem = InferSchemaType<typeof DraftItemSchema>;
export type TDbOrderFinalItem = InferSchemaType<typeof FinalItemSchema>;
export type TDbOrderDraftCustomerInfo = InferSchemaType<typeof DraftCustomerInfoSchema>;
export type TDbOrderFinalCustomerInfo = InferSchemaType<typeof FinalCustomerInfoSchema>;
export type TDbOrderDraftDelivery = InferSchemaType<typeof DraftDeliverySchema>;
export type TDbOrderFinalDelivery = InferSchemaType<typeof FinalDeliverySchema>;
export type TDbOrderDraftFinancials = InferSchemaType<typeof DraftFinancialsSchema>;
export type TDbOrderFinalFinancials = InferSchemaType<typeof FinalFinancialsSchema>;
export type TDbOrderFinancialsEventEntry = InferSchemaType<typeof EventEntrySchema>;
export type TDbOrderFinancialsEventVoided = InferSchemaType<typeof EventVoidedSchema>;
export type TDbOrderCurrentOnlineTransaction = InferSchemaType<typeof CurrentOnlineTransactionSchema>;
export type TDbOrderAuditLogEntry = InferSchemaType<typeof AuditLogSchema>;

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

// Расширения типов моделей
export type TDbNotificationExtended = TDbNotification & {
    isRead?: boolean;
    readAt?: Date | null;
};
export type TDbOrderWithTx = TDbOrderFinal & {
    financials: TDbOrderFinal['financials'] & {
        currentOnlineTransaction: NonNullable<TDbOrderFinal['financials']['currentOnlineTransaction']>;
    };
};

// Типизация схем моделей как документов (с методами и другими встроенными данными)
export type TDbCriticalEventDoc = HydratedDocument<TDbCriticalEvent>;
export type TDbCounterDoc = HydratedDocument<TDbCounter>;
export type TDbUserDoc = HydratedDocument<TDbUser>;
export type TDbNewsDoc = HydratedDocument<TDbNews>;
export type TDbPromoDoc = HydratedDocument<TDbPromo>;
export type TDbNotificationDoc = HydratedDocument<TDbNotification>;
export type TDbNotificationExtendedDoc = HydratedDocument<TDbNotificationExtended>;
export type TDbCategoryDoc = HydratedDocument<TDbCategory>;
export type TDbProductDoc = HydratedDocument<TDbProduct>;
export type TDbOrderDraftDoc = HydratedDocument<TDbOrderDraft>;
export type TDbOrderFinalDoc = HydratedDocument<TDbOrderFinal>;
export type TDbOrderDoc = HydratedDocument<TDbOrder>;
export type TDbOrderWithTxDoc = HydratedDocument<TDbOrderWithTx>;
