import { Schema } from 'mongoose';
import { EventHistoryEntrySchema } from './financials/EventHistoryEntrySchema.js';
import { CurrentOnlineTransactionSchema } from './financials/CurrentOnlineTransactionSchema.js';
import { PAYMENT_METHOD, FINANCIALS_STATE } from '@shared/constants.js';
import { validationRules } from '@shared/fieldRules.js';

const baseFinancialsFields = {
    defaultPaymentMethod: {
        type: String,
        enum: Object.values(PAYMENT_METHOD),
        set: (val: null | string): undefined | string => val === null ? undefined : val
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
        validate: [(val: number): boolean => validationRules.financials.totalPaid.test(String(val))]
    },
    totalRefunded: { // Агрегируемая сумма поступления всех траншей возвратов
        type: Number,
        default: 0,
        validate: [(val: number): boolean => validationRules.financials.totalRefunded.test(String(val))]
    },
    eventHistory: [EventHistoryEntrySchema],
    currentOnlineTransaction: {
        type: CurrentOnlineTransactionSchema,
        default: undefined
    }
}, {
    _id: false
});
