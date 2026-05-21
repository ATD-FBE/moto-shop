import { Schema } from 'mongoose';
import { validationRules } from '@shared/fieldRules.js';
import { DELIVERY_METHOD } from '@shared/constants.js';

const baseDeliveryFields = {
    deliveryMethod: {
        type: String,
        enum: Object.values(DELIVERY_METHOD),
        set: (val: null | string): string | undefined => val === null ? undefined : val
    },
    allowCourierExtra: {
        type: Boolean,
        set: (val: null | boolean): boolean | undefined => val === null ? undefined : val
    },
    shippingAddress: {
        region: {
            type: String,
            set: (val: null | string): string | undefined => val === null ? undefined : val
        },
        district: {
            type: String,
            set: (val: null | string): string | undefined => val === null ? undefined : val
        },
        city: {
            type: String,
            set: (val: null | string): string | undefined => val === null ? undefined : val
        },
        street: {
            type: String,
            set: (val: null | string): string | undefined => val === null ? undefined : val
        },
        house: {
            type: String,
            set: (val: null | string): string | undefined => val === null ? undefined : val
        },
        apartment: {
            type: String,
            match: validationRules.checkout.apartment,
            set: (val: null | string): string | undefined => val === null ? undefined : val
        },
        postalCode: {
            type: String,
            match: validationRules.checkout.postalCode,
            set: (val: null | string): string | undefined => val === null ? undefined : val
        }
    }
};

// Для хранения в профиле пользователя (всё опционально)
export const DraftDeliverySchema = new Schema(baseDeliveryFields, { _id: false });

// Для хранения в заказе (ключевые поля обязательны)
export const FinalDeliverySchema = new Schema({
    deliveryMethod: {
        ...baseDeliveryFields.deliveryMethod,
        required: true
    },
    allowCourierExtra: baseDeliveryFields.allowCourierExtra,
    shippingAddress: {
        type: new Schema({
            region: { // Опционально для заказа
                ...baseDeliveryFields.shippingAddress.region,
                match: validationRules.checkout.region
            },
            district: { // Опционально для заказа
                ...baseDeliveryFields.shippingAddress.district,
                match: validationRules.checkout.district
            },
            city: {
                ...baseDeliveryFields.shippingAddress.city,
                match: validationRules.checkout.city,
                required: true
            },
            street: {
                ...baseDeliveryFields.shippingAddress.street,
                match: validationRules.checkout.street,
                required: true
            },
            house: {
                ...baseDeliveryFields.shippingAddress.house,
                match: validationRules.checkout.house,
                required: true
            },
            apartment: { // Опционально для заказа
                ...baseDeliveryFields.shippingAddress.apartment,
                match: validationRules.checkout.apartment
            },
            postalCode: { // Опционально для заказа
                ...baseDeliveryFields.shippingAddress.postalCode,
                match: validationRules.checkout.postalCode
            }
        }, {
            _id: false
        })
    },
    shippingCost: {
        type: Number,
        min: 0
    }
}, {
    _id: false
});
