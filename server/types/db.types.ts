import { InferSchemaType, Schema, Types } from 'mongoose';
import { UpdateHistoryItemSchema } from '@server/database/models/schemas/UpdateHistoryItemSchema.js';
import { DraftCustomerInfoSchema, FinalCustomerInfoSchema } from '@server/database/models/schemas/CustomerInfoSchemas.js';
import { DraftDeliverySchema, FinalDeliverySchema } from '@server/database/models/schemas/DeliverySchemas.js';
import { DraftFinancialsSchema, FinalFinancialsSchema } from '@server/database/models/schemas/FinancialsSchemas.js';
import { DraftOrderItemSchema, FinalOrderItemSchema } from '@server/database/models/schemas/OrderItemSchemas.js';
import { CategorySchema } from '@server/database/models/Category.js';
import { CounterSchema } from '@server/database/models/Counter.js';
import { CriticalEventSchema } from '@server/database/models/CriticalEvent.js';
import { NewsSchema } from '@server/database/models/News.js';
import { NotificationSchema } from '@server/database/models/Notification.js';
import { ProductSchema } from '@server/database/models/Product.js';
import { PromoSchema } from '@server/database/models/Promo.js';
import { UserSchema } from '@server/database/models/User.js';
import { BaseOrderSchema, DraftOrderSchema, FinalOrderSchema } from '@server/database/models/Order.js';

// Хелпер TS для временного изменения типа полей в схемах
export type TPopulated<T, Keys extends keyof T, TReplacement> = Omit<T, Keys> & {
    [K in Keys]: TReplacement;
};

/// Типизация подсхем моделей ///
export type TUpdateHistoryItem = InferSchemaType<typeof UpdateHistoryItemSchema>;
export type TDraftCustomerInfo = InferSchemaType<typeof DraftCustomerInfoSchema>;
export type TFinalCustomerInfo = InferSchemaType<typeof FinalCustomerInfoSchema>;
export type TDraftDelivery = InferSchemaType<typeof DraftDeliverySchema>;
export type TFinalDelivery = InferSchemaType<typeof FinalDeliverySchema>;
export type TDraftFinancials = InferSchemaType<typeof DraftFinancialsSchema>;
export type TFinalFinancials = InferSchemaType<typeof FinalFinancialsSchema>;
export type TDraftOrderItem = InferSchemaType<typeof DraftOrderItemSchema>;
export type TFinalOrderItem = InferSchemaType<typeof FinalOrderItemSchema>;

/// Типизация схем моделей ///
export type TBaseDocument<T extends Schema> = InferSchemaType<T> & {
    _id: Types.ObjectId;
    createdAt?: Date;
    updatedAt?: Date;
};

export type TCategory = TBaseDocument<typeof CategorySchema>;
export type TCounter = TBaseDocument<typeof CounterSchema>;
export type TCriticalEvent = TBaseDocument<typeof CriticalEventSchema>;
export type TNews = TBaseDocument<typeof NewsSchema>;
export type TNotification = TBaseDocument<typeof NotificationSchema>;
export type TProduct = TBaseDocument<typeof ProductSchema>;
export type TUser = TBaseDocument<typeof UserSchema>;
export type TPromo = TBaseDocument<typeof PromoSchema>;

export type TBaseOrder = TBaseDocument<typeof BaseOrderSchema>;
export type TDraftOrder = TBaseOrder & InferSchemaType<typeof DraftOrderSchema>;
export type TFinalOrder = TBaseOrder & InferSchemaType<typeof FinalOrderSchema>;
export type TOrder = TDraftOrder | TFinalOrder;

/// Изменение типа полей при заполнении (вызове populated) ///
export type TUpdateHistoryItemPopulated = TPopulated<TUpdateHistoryItem, 'updatedBy', { name: string }>;

export type TNewsPopulated = TPopulated<TNews, 'createdBy', { _id: Types.ObjectId, name: string }> & {
    updateHistory: TUpdateHistoryItemPopulated[];
};

export type TPromoPopulated = TPopulated<TPromo, 'createdBy', { _id: Types.ObjectId, name: string }> & {
    updateHistory: TUpdateHistoryItemPopulated[];
};

export type TNotificationPopulated = TPopulated<TNotification, 'createdBy', { _id: Types.ObjectId, name: string }> & {
    updateHistory: TUpdateHistoryItemPopulated[];
};
