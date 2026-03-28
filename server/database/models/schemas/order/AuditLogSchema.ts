import { Schema } from 'mongoose';

export const AuditLogSchema = new Schema({
    changes: [{
        _id: false,
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
