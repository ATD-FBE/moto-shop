import { Schema, model } from 'mongoose';
import type { TDbCriticalEvent } from '@server/types/index.js';

export const CriticalEventSchema = new Schema({
    category: {
        type: String,
        required: true
    },
    reason: {
        type: String,
        default: 'UNKNOWN'
    },
    data: {
        type: Schema.Types.Mixed,
        required: true
    },
    resolved: {
        type: Boolean,
        default: false
    },
    resolvedAt: {
        type: Date
    },
    comment: {
        type: String
    }
}, {
    timestamps: true // Автоматическое добавление полей createdAt и updatedAt
});

const CriticalEvent = model<TDbCriticalEvent>('CriticalEvent', CriticalEventSchema);

export default CriticalEvent;
