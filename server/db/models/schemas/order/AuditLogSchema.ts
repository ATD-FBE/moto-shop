import { Schema } from 'mongoose';
import { USER_ROLE } from '@shared/constants.js';

export const AuditLogSchema = new Schema({
    changes: [{
        field: {
            type: String,
            required: true
        },
        oldValue: Schema.Types.Mixed,
        newValue: Schema.Types.Mixed,
        currency: Boolean
    }],
    reason: {
        type: String,
        required: true
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
                enum: [USER_ROLE.ADMIN],
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
