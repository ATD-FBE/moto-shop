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
import { ORDER_STATUS, ORDER_STATUS_CONFIG } from '@shared/constants.js';
import type { TDbOrder } from '@server/types/index.js';

export const BaseOrderSchema = new Schema({
    _modelType: { // Поле ключа дискриминатора для подсхем DraftOrderSchema/FinalOrderSchema
        type: String,
        enum: Object.values(ORDER_MODEL_TYPE),
        default: ORDER_MODEL_TYPE.DRAFT
    },
    orderNumber: { // Для создания индекса для базовой схемы
        type: String,
        unique: true,
        sparse: true, // Проверка уникальности не применяется к отсутствующим документам
        default: undefined
    },
    customerId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    currentStatus: { // Дубликат для поиска в базе и проверок
        type: String,
        enum: Object.keys(ORDER_STATUS_CONFIG),
        default: ORDER_STATUS.DRAFT
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
        set: (val: null | string): undefined | string => val === null ? undefined : val
    }
}, {
    discriminatorKey: '_modelType', // Ключ дискриминатора для подсхем DraftOrderSchema/FinalOrderSchema
    optimisticConcurrency: true // Документ сохраняется, если не изменилась версия (метод save())
});

// Черновик — без required на полях в схемах customerInfo/delivery/financials
export const DraftOrderSchema = new Schema({
    items: [DraftItemSchema],
    customerInfo: DraftCustomerInfoSchema,
    delivery: DraftDeliverySchema,
    financials: DraftFinancialsSchema,
    expiresAt: {
        type: Date,
        required: true
    }
}); // { _id: false } - Для дискриминаторов не нужно отключать _id для стабильности
  
// Подтверждённый/рабочий заказ — с required на полях в схемах customerInfo/delivery/financials
export const FinalOrderSchema = new Schema({
    orderNumber: {
        type: String,
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
        default: Date.now
    },
    internalNote: { // Опционально
        type: String,
        match: validationRules.order.internalNote,
        set: (val: null | string): undefined | string => val === null ? undefined : val
    },
    auditLog: {
        type: [AuditLogSchema],
        default: undefined // Пустой массив не создаётся
    }
}); // { _id: false } - Для дискриминаторов не нужно отключать _id для стабильности

// Составной индекс для поиска по ID юзера и статусу
BaseOrderSchema.index({ customerId: 1, currentStatus: 1 });

// Ограничительный индекс для создания черновика заказа (только 1 для каждого клиента)
BaseOrderSchema.index(
    { _id: 1, customerId: 1, currentStatus: 1 }, // Условие индекса по полям
    { unique: true, partialFilterExpression: { currentStatus: ORDER_STATUS.DRAFT } } // Настройки индекса
);

// Индекс для поиска просроченных онлайн-оплат
BaseOrderSchema.index(
    {
        'financials.currentOnlineTransaction.status': 1,
        'financials.currentOnlineTransaction.startedAt': 1
    },
    { // Индексация только того, что реально нужно чистить
        partialFilterExpression: { 'financials.currentOnlineTransaction.status': 'PENDING' }
    }
);

const Order = model<TDbOrder>('Order', BaseOrderSchema);

// Подключение схем DraftOrderSchema/FinalOrderSchema через дискриминатор модели
Order.discriminator(ORDER_MODEL_TYPE.DRAFT, DraftOrderSchema);
Order.discriminator(ORDER_MODEL_TYPE.FINAL, FinalOrderSchema);

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
