import { Schema } from 'mongoose';
import { EventEntrySchema } from './financials/EventEntrySchema.js';
import { CurrentOnlineTransactionSchema } from './financials/CurrentOnlineTransactionSchema.js';
import { PAYMENT_METHOD, FINANCIALS_STATE } from '@shared/constants.js';
import { currencyValidation } from '@shared/fieldRules.js';

const baseFinancialsFields = {
    defaultPaymentMethod: {
        type: String,
        enum: Object.values(PAYMENT_METHOD),
        set: (val: null | string): string | undefined => val === null ? undefined : val
    }
};

// Для хранения в профиле пользователя (всё опционально)
export const DraftFinancialsSchema = new Schema(baseFinancialsFields, { _id: false });

// Для хранения в заказе (ключевые поля обязательны)
export const FinalFinancialsSchema = new Schema({
    defaultPaymentMethod: {
        ...baseFinancialsFields.defaultPaymentMethod,
        required: true
    },
    state: {
        type: String,
        enum: Object.values(FINANCIALS_STATE),
        default: FINANCIALS_STATE.PAID_PENDING
    },
    totalPaid: { // Агрегируемая сумма поступления всех траншей оплат
        type: Number,
        default: 0,
        validate: [(val: number): boolean => currencyValidation(String(val))]
    },
    totalRefunded: { // Агрегируемая сумма поступления всех траншей возвратов
        type: Number,
        default: 0,
        validate: [(val: number): boolean => currencyValidation(String(val))]
    },
    eventHistory: [EventEntrySchema],
    currentOnlineTransaction: {
        type: CurrentOnlineTransactionSchema,
        default: undefined
    }
}, {
    _id: false
});
