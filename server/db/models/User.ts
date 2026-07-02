import { Schema, model } from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import bcrypt from 'bcrypt';
import { NotificationItemSchema } from './schemas/user/NotificationItemSchema.js';
import { CartItemSchema } from './schemas/user/CartItemSchema.js';
import { DraftCustomerInfoSchema } from './schemas/order/CustomerInfoSchemas.js';
import { DraftDeliverySchema } from './schemas/order/DeliverySchemas.js';
import { DraftFinancialsSchema } from './schemas/order/FinancialsSchemas.js';
import { validationRules } from '@shared/fieldRules.js';
import { USER_ROLE, REGISTERED_USER_ROLES } from '@shared/constants.js';
import type { TDbUser } from '@server/types/index.js';

const SALT_ROUNDS = 12;

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
        enum: REGISTERED_USER_ROLES,
        default: USER_ROLE.CUSTOMER
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
UserSchema.pre('validate', function() {
    // При регистрации поле 'password' обязательное
    if (this.isNew && !this.password) {
        this.invalidate('password', 'Path `password` is invalid');
    }
});

// Хук срабатывает ПОСЛЕ валидации полей mongoose, но перед сохранением документа
UserSchema.pre('save', async function() {
    // Удаление ненужных полей у админа после его создания
    if (this.isNew && this.role === USER_ROLE.ADMIN) {
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
});

// Метод для проверки пароля
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
    if (typeof this.hashedPassword !== 'string') return false;
    return bcrypt.compare(candidatePassword, this.hashedPassword);
};

// Плагин, собирающий все ошибки уникальности полей до выбрасывания исключения
UserSchema.plugin(uniqueValidator);

const User = model<TDbUser>('User', UserSchema);

export default User;
