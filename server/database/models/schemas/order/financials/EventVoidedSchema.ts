import { Schema } from 'mongoose';
import { USER_ROLE } from '@shared/constants.js';
import { validationRules } from '@shared/fieldRules.js';

// Аннулирование существующей записи в истории
export const EventVoidedSchema = new Schema({
    flag: {
        type: Boolean,
        required: true // В поддокументе вместо default нужно ставить required
    },
    note: { // Опционально
        type: String,
        match: validationRules.financials.voidedNote
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
        required: true
    },
    changedAt: {
        type: Date,
        required: true // В поддокументе вместо default нужно ставить required
    }
}, {
    _id: false
});
