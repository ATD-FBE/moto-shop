import { Schema } from 'mongoose';
import { validationRules } from '@shared/fieldRules.js';
import { ORDER_STATUS, USER_ROLE } from '@shared/constants.js';

export const StatusHistoryEntrySchema = new Schema({
    status: {
        type: String,
        required: true,
        enum: Object.values(ORDER_STATUS)
    },
    isRollback: {
        type: Boolean
    },
    changes: {
        type: [{
            _id: false,
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
        _id: false,
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
            enum: Object.values(USER_ROLE),
            required: true
        }
    },
    changedAt: {
        type: Date,
        default: Date.now
    }
}, {
    _id: false
});
