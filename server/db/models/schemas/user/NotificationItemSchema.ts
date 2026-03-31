import { Schema } from 'mongoose';

export const NotificationItemSchema = new Schema({
    notificationId: {
        type: Schema.Types.ObjectId,
        ref: 'Notification',
        required: true
    },
    isRead: {
        type: Boolean,
        default: false
    },
    readAt: {
        type: Date,
        default: null
    }
}, {
    _id: false
});
