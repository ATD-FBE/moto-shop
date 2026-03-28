import { InferSchemaType, HydratedDocument, Schema, Types } from 'mongoose';
import { UpdateHistoryItemSchema } from '@server/database/models/schemas/UpdateHistoryItemSchema.js';
import { NotificationItemSchema } from '@server/database/models/schemas/user/NotificationItemSchema.js';
import { CartItemSchema } from '@server/database/models/schemas/user/CartItemSchema.js';
import { StatusHistoryEntrySchema } from '@server/database/models/schemas/order/StatusHistoryEntrySchema.js';
import { TotalsSchema } from '@server/database/models/schemas/order/TotalsSchema.js';
import { AuditLogSchema } from '@server/database/models/schemas/order/AuditLogSchema.js';
import {
    DraftCustomerInfoSchema,
    FinalCustomerInfoSchema
} from '@server/database/models/schemas/order/CustomerInfoSchemas.js';
import {
    DraftDeliverySchema,
    FinalDeliverySchema
} from '@server/database/models/schemas/order/DeliverySchemas.js';
import {
    DraftFinancialsSchema,
    FinalFinancialsSchema
} from '@server/database/models/schemas/order/FinancialsSchemas.js';
import {
    DraftItemSchema,
    FinalItemSchema
} from '@server/database/models/schemas/order/ItemSchemas.js';
import { CategorySchema } from '@server/database/models/Category.js';
import { CounterSchema } from '@server/database/models/Counter.js';
import { CriticalEventSchema } from '@server/database/models/CriticalEvent.js';
import { NewsSchema } from '@server/database/models/News.js';
import { NotificationSchema } from '@server/database/models/Notification.js';
import { ProductSchema } from '@server/database/models/Product.js';
import { PromoSchema } from '@server/database/models/Promo.js';
import { UserSchema } from '@server/database/models/User.js';
import { BaseOrderSchema, DraftOrderSchema, FinalOrderSchema } from '@server/database/models/Order.js';

/// Типизация подсхем моделей ///
export type TDbUpdateHistoryItem = InferSchemaType<typeof UpdateHistoryItemSchema>;
export type TDbUserNotificationItem = InferSchemaType<typeof NotificationItemSchema>;
export type TDbCartItem = InferSchemaType<typeof CartItemSchema>;
export type TDbOrderStatusHistoryEntry = InferSchemaType<typeof StatusHistoryEntrySchema>;
export type TDbOrderTotals = InferSchemaType<typeof TotalsSchema>;
export type TDbOrderAuditLog = InferSchemaType<typeof AuditLogSchema>;
export type TDbOrderDraftCustomerInfo = InferSchemaType<typeof DraftCustomerInfoSchema>;
export type TDbOrderFinalCustomerInfo = InferSchemaType<typeof FinalCustomerInfoSchema>;
export type TDbOrderDraftDelivery = InferSchemaType<typeof DraftDeliverySchema>;
export type TDbOrderFinalDelivery = InferSchemaType<typeof FinalDeliverySchema>;
export type TDbOrderDraftFinancials = InferSchemaType<typeof DraftFinancialsSchema>;
export type TDbOrderFinalFinancials = InferSchemaType<typeof FinalFinancialsSchema>;
export type TDbOrderDraftItem = InferSchemaType<typeof DraftItemSchema>;
export type TDbOrderFinalItem = InferSchemaType<typeof FinalItemSchema>;

/// Типизация схем моделей ///
export type TBaseDocument<T extends Schema> = InferSchemaType<T> & {
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

/// Типизация схем моделей как документов (с методами и другими встроенными данными) ///
export type TDbCriticalEventDoc = HydratedDocument<TDbCriticalEvent>;
export type TDbCounterDoc = HydratedDocument<TDbCounter>;
export type TDbUserDoc = HydratedDocument<TDbUser>;
export type TDbNewsDoc = HydratedDocument<TDbNews>;
export type TDbPromoDoc = HydratedDocument<TDbPromo>;
export type TDbNotificationDoc = HydratedDocument<TDbNotification>;
export type TDbCategoryDoc = HydratedDocument<TDbCategory>;
export type TDbProductDoc = HydratedDocument<TDbProduct>;
export type TDbOrderDoc = HydratedDocument<TDbOrder>;

/// Изменение типа полей при заполнении (вызове populated) ///
export type TPopulated<T, Keys extends keyof T, TReplacement> = Omit<T, Keys> & {
    [K in Keys]: TReplacement;
};

export type TDbUpdateHistoryItemPopulated = TPopulated<TDbUpdateHistoryItem, 'updatedBy', { name: string }>;
export type TDbNewsPopulated = TPopulated<TDbNews, 'createdBy', { _id: Types.ObjectId, name: string }> & {
    updateHistory: TDbUpdateHistoryItemPopulated[];
};
export type TDbPromoPopulated = TPopulated<TDbPromo, 'createdBy', { _id: Types.ObjectId, name: string }> & {
    updateHistory: TDbUpdateHistoryItemPopulated[];
};
export type TDbNotificationPopulated = TPopulated<TDbNotification, 'createdBy', { _id: Types.ObjectId, name: string }> & {
    updateHistory: TDbUpdateHistoryItemPopulated[];
};
