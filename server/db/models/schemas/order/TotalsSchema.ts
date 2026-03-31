import { Schema } from 'mongoose';

export const TotalsSchema = new Schema({
    subtotalAmount: {
        type: Number,
        required: true,
        min: 0
    },
    totalSavings: {
        type: Number,
        required: true,
        min: 0
    },
    totalAmount: {
        type: Number,
        required: true,
        min: 0
    }
}, {
    _id: false
});
