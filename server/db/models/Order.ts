import { Schema, model } from 'mongoose';
import { StatusHistoryEntrySchema } from './schemas/order/StatusHistoryEntrySchema.js';
import { TotalsSchema } from './schemas/order/TotalsSchema.js';
import { AuditLogSchema } from './schemas/order/AuditLogSchema.js';
import { DraftItemSchema, FinalItemSchema } from './schemas/order/ItemSchemas.js';
import { DraftCustomerInfoSchema, FinalCustomerInfoSchema } from './schemas/order/CustomerInfoSchemas.js';
import { DraftDeliverySchema, FinalDeliverySchema } from './schemas/order/DeliverySchemas.js';
import { DraftFinancialsSchema, FinalFinancialsSchema } from './schemas/order/FinancialsSchemas.js';
import { ORDER_MODEL_TYPE } from '@server/config/constants.js';
import { validationRules } from '@shared/fieldRules.js';
import { ORDER_STATUS } from '@shared/constants.js';
import type { TDbOrder, TDbOrderDraft, TDbOrderFinal } from '@server/types/index.js';

export const OrderBaseSchema = new Schema({
    _modelType: { // Поле ключа дискриминатора для подсхем OrderDraftSchema/OrderFinalSchema
        type: String,
        enum: [ORDER_MODEL_TYPE.DRAFT, ORDER_MODEL_TYPE.FINAL],
        required: true,
        immutable: true
    },
    customerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        immutable: true
    },
    currentStatus: {
        type: String,
        enum: Object.values(ORDER_STATUS),
        required: true
    },
    lastActivityAt: { // Дубликат для сортировки по дате изменения статуса заказа или финансового события
        type: Date,
        default: Date.now
    },
    statusHistory: [StatusHistoryEntrySchema],
    totals: {
        type: TotalsSchema,
        required: true
    },
    customerComment: { // Опционально
        type: String,
        set: (val: null | string): string | undefined => val === null ? undefined : val
    }
}, {
    discriminatorKey: '_modelType', // Ключ дискриминатора для подсхем OrderDraftSchema/OrderFinalSchema
    optimisticConcurrency: true // Документ сохраняется, если не изменилась версия (метод save())
});

// Черновик — без required на полях в схемах customerInfo/delivery/financials
export const OrderDraftSchema = new Schema({
    currentStatus: { // Дубликат для поиска в базе и проверок
        type: String,
        enum: [ORDER_STATUS.DRAFT],
        default: ORDER_STATUS.DRAFT,
        immutable: true
    },
    items: [DraftItemSchema],
    customerInfo: DraftCustomerInfoSchema,
    delivery: DraftDeliverySchema,
    financials: DraftFinancialsSchema,
    expiresAt: {
        type: Date,
        required: true,
        immutable: true
    }
}); // { _id: false } - Для дискриминатора не нужно отключать _id для стабильности
  
// Подтверждённый/рабочий заказ — с required на полях в схемах customerInfo/delivery/financials
export const OrderFinalSchema = new Schema({
    orderNumber: {
        type: String,
        required: true,
        immutable: true
    },
    currentStatus: { // Дубликат для поиска в базе и проверок
        type: String,
        enum: Object.values(ORDER_STATUS).filter(status => status !== ORDER_STATUS.DRAFT),
        required: true
    },
    items: [FinalItemSchema],
    customerInfo: {
        type: FinalCustomerInfoSchema,
        required: true
    },
    delivery: {
        type: FinalDeliverySchema,
        required: true
    },
    financials: {
        type: FinalFinancialsSchema,
        required: true
    },
    confirmedAt: { // Только для сортировки
        type: Date,
        default: Date.now,
        immutable: true
    },
    internalNote: { // Опционально
        type: String,
        match: validationRules.order.internalNote,
        set: (val: null | string): string | undefined => val === null ? undefined : val
    },
    auditLog: {
        type: [AuditLogSchema],
        default: undefined // Пустой массив не создаётся
    }
}); // { _id: false } - Для дискриминатора не нужно отключать _id для стабильности

// Составной индекс для поиска подтверждённого заказа по ID покупателя и статусу
OrderBaseSchema.index({ customerId: 1, currentStatus: 1 });

// Ограничительный индекс для создания черновика заказа (только 1 для каждого клиента)
OrderDraftSchema.index(
    { customerId: 1 },
    { unique: true, partialFilterExpression: { _modelType: ORDER_MODEL_TYPE.DRAFT } }
);

// Индекс для поиска истёкших черновиков заказа
OrderDraftSchema.index(
    { expiresAt: 1 },
    { partialFilterExpression: { _modelType: ORDER_MODEL_TYPE.DRAFT } }
);

// Индекс для поиска по уникальному номеру подтверждённого заказа
OrderFinalSchema.index(
    { orderNumber: 1 },
    { unique: true, partialFilterExpression: { _modelType: ORDER_MODEL_TYPE.FINAL } }
);

// Индекс для поиска просроченных онлайн-оплат подтверждённого заказа
OrderFinalSchema.index(
    {
        'financials.currentOnlineTransaction.status': 1,
        'financials.currentOnlineTransaction.startedAt': 1
    },
    {
        partialFilterExpression: { // Индексация только того, что реально нужно чистить
            _modelType: ORDER_MODEL_TYPE.FINAL,
            'financials.currentOnlineTransaction.status': 'PENDING'
        }
    }
);

const Order = model<TDbOrder>('Order', OrderBaseSchema);

// Подключение виртуальных моделей OrderDraftSchema/OrderFinalSchema через дискриминатор
export const OrderDraft = Order.discriminator<TDbOrderDraft>(ORDER_MODEL_TYPE.DRAFT, OrderDraftSchema);
export const OrderFinal = Order.discriminator<TDbOrderFinal>(ORDER_MODEL_TYPE.FINAL, OrderFinalSchema);
export default Order;



/*
Работа с auditLog по изменению содержимого заказа:

Изменение количества товара:
{
    "changes": [{
        "field": "items[2].quantity",
        "oldValue": 3,
        "newValue": 5
    }],
    "reason": "Уточнил количество по телефону",
    "changedBy": "64bf...",
    "changedAt": "..."
}

Удаление позиции из заказа:
{
    "changes": [{
        "field": "items[1]",
        "oldValue": { "sku": "...", "name": "...", "quantity": 1, ... },
        "newValue": undefined
    }],
    "reason": "Клиент отказался от этой позиции",
    "changedBy": "64bf...",
    "changedAt": "..."
}

Добавление товара админом:
{
    "changes": [{
        "field": "items[3]",
        "oldValue": undefined,
        "newValue": { "sku": "...", "name": "...", "quantity": 2, ... }
    }],
    "reason": "Добавлено по запросу клиента",
    "changedBy": "64bf...",
    "changedAt": "..."
}
*/
