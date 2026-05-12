import { Schema } from 'mongoose';
import { validationRules } from '@shared/fieldRules.js';
import { ORDER_STATUS, USER_ROLE } from '@shared/constants.js';

export const StatusHistoryEntrySchema = new Schema({
    status: {
        type: String,
        enum: Object.values(ORDER_STATUS),
        required: true
    },
    isRollback: {
        type: Boolean
    },
    changes: {
        type: [{
            field: {
                type: String,
                required: true
            },
            oldValue: Schema.Types.Mixed,
            newValue: Schema.Types.Mixed,
            currency: Boolean
        }],
        default: undefined // Пустой массив не создаётся
    },
    cancellationReason: {
        type: String,
        match: validationRules.order.cancellationReason
    },
    changedBy: {
        type: {
            id: {
                type: Schema.Types.ObjectId,
                ref: 'User',
                required: true
            },
            name: {
                type: String,
                required: true
            },
            role: {
                type: String,
                enum: [USER_ROLE.CUSTOMER, USER_ROLE.ADMIN],
                required: true
            }
        },
        _id: false,
        required: true
    },
    changedAt: {
        type: Date,
        default: Date.now
    }
}, {
    _id: false
});
