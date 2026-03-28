import { Schema } from 'mongoose';

export const CartItemSchema = new Schema({
    productId: {
        type: Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    quantity: {
        type: Number,
        min: 0,
        required: true
    },
    nameSnapshot: {
        type: String,
        required: true
    },
    brandSnapshot: { // Опционально
        type: String,
        set: (val: null | string): undefined | string => val === null ? undefined : val
    }
}, {
    _id: false
});
