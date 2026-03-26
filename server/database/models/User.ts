import { Schema, model } from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import bcrypt from 'bcrypt';
import { DraftCustomerInfoSchema } from './schemas/CustomerInfoSchemas.js';
import { DraftDeliverySchema } from './schemas/DeliverySchemas.js';
import { DraftFinancialsSchema } from './schemas/FinancialsSchemas.js';
import { validationRules } from '@shared/fieldRules.js';
import { toError } from '@shared/commonHelpers.js';
import { USER_ROLE } from '@shared/constants.js';
import type { TUser } from '@server/types/index.js';

const { ADMIN, CUSTOMER } = USER_ROLE;
const SALT_ROUNDS = 12;

const NotificationItemSchema = new Schema({
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

const CartItemSchema = new Schema({
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

export const UserSchema = new Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        match: validationRules.auth.name
    },
    email: {
        type: String,
        required: true,
        unique: true,
        match: validationRules.auth.email
    },
    password: { // Только для проверки
        type: String,
        match: validationRules.auth.password
    },
    hashedPassword: {
        type: String
    },
    role: {
        type: String,
        enum: [ADMIN, CUSTOMER],
        default: CUSTOMER
    },
    notifications: [NotificationItemSchema],
    discount: { // В процентах
        type: Number,
        min: 0,
        max: 100,
        default: 0
    },
    cart: [CartItemSchema],
    totalSpent: {
        type: Number,
        default: 0
    },
    checkoutPrefs: {
        customerInfo: DraftCustomerInfoSchema,
        delivery: DraftDeliverySchema,
        financials: DraftFinancialsSchema
    },
    isBanned: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true // Автоматическое добавление полей createdAt и updatedAt
});

// Хук срабатывает ДО валидации полей mongoose
UserSchema.pre('validate', function(next) {
    // При регистрации поле 'password' обязательное
    if (this.isNew && !this.password) {
        this.invalidate('password', 'Path `password` is invalid');
    }

    next();
});

// Хук срабатывает ПОСЛЕ валидации полей mongoose, но перед сохранением документа
UserSchema.pre('save', async function(next) {
    try {
        // Удаление ненужных полей у админа после его создания
        if (this.isNew && this.role === ADMIN) {
            this.set('notifications', undefined, { strict: false });
            this.set('discount', undefined, { strict: false });
            this.set('cart', undefined, { strict: false });
            this.set('totalSpent', undefined, { strict: false });
            this.set('checkoutPrefs', undefined, { strict: false });
            this.set('orders', undefined, { strict: false });
            this.set('isBanned', undefined, { strict: false });
        }

        // Хеширование пароля при создании нового юзера или изменении пароля у существующего
        if (this.isModified('password') && typeof this.password === 'string') {
            const salt = await bcrypt.genSalt(SALT_ROUNDS);
            this.hashedPassword = await bcrypt.hash(this.password, salt);
            this.markModified('hashedPassword');
            this.set('password', undefined, { strict: false }); // Удаление поля password
        }

        next();
    } catch (err) {
        next(toError(err));
    }
});

// Метод для проверки пароля
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
    if (typeof this.hashedPassword !== 'string') return false;
    return bcrypt.compare(candidatePassword, this.hashedPassword);
};

// Плагин, собирающий все ошибки уникальности полей до выбрасывания исключения
UserSchema.plugin(uniqueValidator);

const User = model<TUser>('User', UserSchema);

export default User;
