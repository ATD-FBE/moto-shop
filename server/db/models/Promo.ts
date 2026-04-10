import { Schema, model } from 'mongoose';
import UpdateHistoryItemSchema from './schemas/UpdateHistoryItemSchema.js';
import { validationRules } from '@shared/fieldRules.js';
import type { TDbPromo } from '@server/types/index.js';

export const PromoSchema = new Schema({
    title: {
        type: String,
        required: true,
        match: validationRules.promotion.title
    },
    imageFilename: { // Опционально
        type: String,
        set: (val: null | string): string | undefined => val === null ? undefined : val
    },
    description: {
        type: String,
        required: true,
        match: validationRules.promotion.description
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updateHistory: [UpdateHistoryItemSchema]
}, {
    timestamps: true // Автоматическое добавление полей createdAt и updatedAt
});

const Promo = model<TDbPromo>('Promo', PromoSchema);

export default Promo;
