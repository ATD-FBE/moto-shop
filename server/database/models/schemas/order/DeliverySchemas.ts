import { Schema } from 'mongoose';
import { validationRules } from '@shared/fieldRules.js';
import { DELIVERY_METHOD, DELIVERY_METHOD_OPTIONS } from '@shared/constants.js';
import type { TDbOrderFinalDelivery } from '@server/types/index.js';

const baseDeliveryFields = {
    deliveryMethod: {
        type: String,
        enum: DELIVERY_METHOD_OPTIONS.map(opt => opt.value),
        set: (val: null | string): undefined | string => val === null ? undefined : val
    },
    allowCourierExtra: {
        type: Boolean,
        default: function (this: any): undefined | boolean {
            return this.deliveryMethod === DELIVERY_METHOD.COURIER ? false : undefined;
        },
        set: (val: null | boolean): undefined | boolean => val === null ? undefined : val
    },
    shippingAddress: {
        region: { // Опционально для заказа
            type: String,
            set: (val: null | string): undefined | string => val === null ? undefined : val
        },
        district: { // Опционально для заказа
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
        apartment: { // Опционально для заказа
            type: String,
            match: validationRules.checkout.apartment,
            set: (val: null | string): undefined | string => val === null ? undefined : val
        },
        postalCode: { // Опционально для заказа
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
            required: isDeliveryRequired,
            match: validationRules.checkout.city
        },
        street: {
            ...baseDeliveryFields.shippingAddress.street,
            required: isDeliveryRequired,
            match: validationRules.checkout.street
        },
        house: {
            ...baseDeliveryFields.shippingAddress.house,
            required: isDeliveryRequired,
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
    shippingCost: {
        type: Number,
        min: 0
    }
}, {
    _id: false
});

// this в функции required надёжен для обычных поддокументов, но не надёжен для поддокументов массивов
function isDeliveryRequired(this: TDbOrderFinalDelivery): boolean {
    return this.deliveryMethod !== DELIVERY_METHOD.SELF_PICKUP;
}
