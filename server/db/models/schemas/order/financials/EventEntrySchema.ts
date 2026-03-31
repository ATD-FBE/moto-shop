import { Schema, Types } from 'mongoose';
import { EventVoidedSchema } from './EventVoidedSchema.js';
import {
    USER_ROLE,
    PAYMENT_METHOD,
    REFUND_METHOD,
    BANK_PROVIDER,
    CARD_ONLINE_PROVIDER,
    FINANCIALS_EVENT
} from '@shared/constants.js';
import { validationRules } from '@shared/fieldRules.js';

export const EventEntrySchema = new Schema({
    eventId: {
        type: Schema.Types.ObjectId,
        default: () => new Types.ObjectId()
    },
    event: {
        type: String,
        required: true,
        enum: Object.values(FINANCIALS_EVENT)
    },
    action: {
        type: {
            method: {
                type: String,
                required: true,
                enum: [...Object.values(PAYMENT_METHOD), ...Object.values(REFUND_METHOD)]
            },
            amount: { // Сумма транша/попытки оплаты/возврата
                type: Number,
                required: true,
                validate: [(val: number): boolean => validationRules.financials.amount.test(String(val))]
            },
            provider: { // Банк при переводе/провайдер платёжного шлюза при оплате/возврате картой онлайн
                type: String,
                enum: [...Object.values(BANK_PROVIDER), ...Object.values(CARD_ONLINE_PROVIDER)]
            },
            transactionId: { // ID транзакции при банковском переводе/оплате картой онлайн
                type: String,
                match: validationRules.financials.transactionId
            },
            originalPaymentId: { // ID платёжной транзакции для возврата на карту онлайн
                type: String,
                match: validationRules.refund.originalPaymentId
            },
            failureReason: { // Опционально для банковского перевода и онлайн-транзакций
                type: String,
                match: validationRules.financials.failureReason
            },
            externalReference: { // Опциональные данные по терминалу при возврате на карту вручную
                type: String,
                match: validationRules.refund.externalReference
            }
        },
        required: true
    },
    changedBy: {
        type: {
            id: { // Отсутствует для SYSTEM
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            name: {
                type: String,
                default: 'SYSTEM'
            },
            role: {
                type: String,
                enum: Object.values(USER_ROLE),
                default: USER_ROLE.SYSTEM
            }
        },
        required: true
    },
    changedAt: {
        type: Date,
        default: Date.now
    },
    voided: {
        type: EventVoidedSchema,
        default: undefined
    }
}, {
    _id: false
});
