import { Schema, model } from 'mongoose';
import UpdateHistoryItemSchema from './schemas/UpdateHistoryItemSchema.js';
import { validationRules } from '@shared/fieldRules.js';
import type { TDbNews } from '@server/types/index.js';

export const NewsSchema = new Schema({
    title: {
        type: String,
        required: true,
        match: validationRules.news.title
    },
    content: {
        type: String,
        required: true,
        match: validationRules.news.content
    },
    publishDate: {
        type: Date,
        default: Date.now
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    updateHistory: [UpdateHistoryItemSchema]
});

const News = model<TDbNews>('News', NewsSchema);

export default News;
