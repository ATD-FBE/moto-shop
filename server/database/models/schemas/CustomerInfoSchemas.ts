import { Schema } from 'mongoose';
import { validationRules } from '@shared/fieldRules.js';

const baseCustomerInfoFields = {
    firstName: {
        type: String,
        set: (val: null | string): undefined | string => val === null ? undefined : val
    },
    lastName: {
        type: String,
        set: (val: null | string): undefined | string => val === null ? undefined : val
    },
    middleName: { // Опционально для заказа
        type: String,
        set: (val: null | string): undefined | string => val === null ? undefined : val
    },
    email: {
        type: String,
        set: (val: null | string): undefined | string => val === null ? undefined : val
    },
    phone: {
        type: String,
        set: (val: null | string): undefined | string => val === null ? undefined : val
    }
};

// Для хранения в профиле пользователя (всё опционально)
export const DraftCustomerInfoSchema = new Schema(baseCustomerInfoFields, { _id: false });

// Для хранения в заказе (ключевые поля обязательны)
export const FinalCustomerInfoSchema = new Schema({
    firstName: {
        ...baseCustomerInfoFields.firstName,
        match: validationRules.checkout.firstName,
        required: true
    },
    lastName: {
        ...baseCustomerInfoFields.lastName,
        match: validationRules.checkout.lastName,
        required: true
    },
    middleName: {
        ...baseCustomerInfoFields.middleName,
        match: validationRules.checkout.middleName,
    },
    email: {
        ...baseCustomerInfoFields.email,
        match: validationRules.checkout.email,
        required: true
    },
    phone: {
        ...baseCustomerInfoFields.phone,
        match: validationRules.checkout.phone,
        required: true
    }
}, {
    _id: false
});
