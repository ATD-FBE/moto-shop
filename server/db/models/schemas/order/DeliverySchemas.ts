import { Schema } from 'mongoose';
import { validationRules } from '@shared/fieldRules.js';
import { DELIVERY_METHOD, DELIVERY_METHOD_OPTIONS } from '@shared/constants.js';
import type { TDeliveryMethod } from '@shared/types/index.js';

const baseDeliveryFields = {
    deliveryMethod: {
        type: String,
        enum: DELIVERY_METHOD_OPTIONS.map(opt => opt.value),
        set: (val: null | string): undefined | string => val === null ? undefined : val
    },
    allowCourierExtra: {
        type: Boolean,
        default: function (this: { deliveryMethod?: TDeliveryMethod }): boolean | undefined {
            return this.deliveryMethod === DELIVERY_METHOD.COURIER ? false : undefined;
        },
        set: (val: null | boolean): boolean | undefined => val === null ? undefined : val
    },
    shippingAddress: {
        region: {
            type: String,
            set: (val: null | string): undefined | string => val === null ? undefined : val
        },
        district: {
            type: String,
            set: (val: null | string): undefined | string => val === null ? undefined : val
        },
        city: {
            type: String,
            set: (val: null | string): undefined | string => val === null ? undefined : val
        },
        street: {
            type: String,
            set: (val: null | string): undefined | string => val === null ? undefined : val
        },
        house: {
            type: String,
            set: (val: null | string): undefined | string => val === null ? undefined : val
        },
        apartment: {
            type: String,
            match: validationRules.checkout.apartment,
            set: (val: null | string): undefined | string => val === null ? undefined : val
        },
        postalCode: {
            type: String,
            match: validationRules.checkout.postalCode,
            set: (val: null | string): undefined | string => val === null ? undefined : val
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
        type: {
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
                required: true,
                match: validationRules.checkout.city
            },
            street: {
                ...baseDeliveryFields.shippingAddress.street,
                required: true,
                match: validationRules.checkout.street
            },
            house: {
                ...baseDeliveryFields.shippingAddress.house,
                required: true,
                match: validationRules.checkout.house
            },
            apartment: { // Опционально для заказа
                ...baseDeliveryFields.shippingAddress.apartment,
                match: validationRules.checkout.apartment
            },
            postalCode: { // Опционально для заказа
                ...baseDeliveryFields.shippingAddress.postalCode,
                match: validationRules.checkout.postalCode
            }
        },
        required: function (this: { deliveryMethod: TDeliveryMethod }): boolean {
            return this.deliveryMethod !== DELIVERY_METHOD.SELF_PICKUP;
        }
    },
    shippingCost: {
        type: Number,
        min: 0
    }
}, {
    _id: false
});
