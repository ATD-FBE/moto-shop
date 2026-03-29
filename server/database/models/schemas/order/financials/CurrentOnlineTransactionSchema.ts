import { Schema } from 'mongoose';
import { TRANSACTION_TYPE, TRANSACTION_STATUS, CARD_ONLINE_PROVIDER } from '@shared/constants.js';

// Временный объект с данными онлайн-транзакции (оплата/возврат картой)
export const CurrentOnlineTransactionSchema = new Schema({
    type: {
        type: String,
        enum: Object.values(TRANSACTION_TYPE),
        required: true
    },
    providers: {
        type: [{
            type: String,
            enum: Object.values(CARD_ONLINE_PROVIDER)
        }],
        required: true,
        validate: {
            validator: (arr: unknown[]): boolean => arr.length > 0,
            message: 'providers не может быть пустым массивом'
        }
    },
    status: {
        type: String,
        enum: Object.values(TRANSACTION_STATUS),
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    transactionIds: { // Отсутствует при статусе TRANSACTION_STATUS.INIT -> Создание пустого массива
        type: [{
            type: String
        }],
        default: []
    },
    confirmationUrl: { // Опционально
        type: String
    },
    startedAt: {
        type: Date,
        default: Date.now
    }
}, {
    _id: false
});
