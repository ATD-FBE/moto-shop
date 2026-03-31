import { Schema, model } from 'mongoose';
import UpdateHistoryItemSchema from './schemas/UpdateHistoryItemSchema.js';
import { validationRules } from '@shared/fieldRules.js';
import type { TDbNews } from '@server/types/index.js';

export const NewsSchema = new Schema({
    publishDate: {
        type: Date,
        default: Date.now
    },
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
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    updateHistory: [UpdateHistoryItemSchema]
});

const News = model<TDbNews>('News', NewsSchema);

export default News;
