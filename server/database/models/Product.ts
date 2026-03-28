import { Schema, model } from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { PRODUCT_UNITS } from '@shared/constants.js';
import { validationRules } from '@shared/fieldRules.js';
import type { TDbProduct } from '@server/types/index.js';

export const ProductSchema = new Schema({
    imageFilenames: { // Опционально
        type: [String],
        default: []
    },
    mainImageIndex: { // Зависит от imageFilenames
        type: Number,
        set: (val: null | number): undefined | number => val === null ? undefined : val
    },
    sku: { // Опционально
        type: String,
        match: validationRules.product.sku,
        unique: true,
        sparse: true, // Индекс уникальности не будет срабатывать на документах с отсутствующим полем
        set: (val: null | string): undefined | string => val === null ? undefined : val
    },
    name: {
        type: String,
        required: true,
        match: validationRules.product.name
    },
    brand: { // Опционально
        type: String,
        match: validationRules.product.brand,
        set: (val: null | string): undefined | string => val === null ? undefined : val
    },
    description: { // Опционально
        type: String,
        match: validationRules.product.description,
        set: (val: null | string): undefined | string => val === null ? undefined : val
    },
    stock: {
        type: Number,
        required: true,
        min: 0
    },
    reserved: {
        type: Number,
        min: 0,
        default: 0
    },
    lastRestockAt: {
        type: Date,
        default: Date.now
    },
    unit: {
        type: String,
        required: true,
        enum: PRODUCT_UNITS
    },
    price: {
        type: Number,
        required: true,
        min: 0,
        validate: [ // Не сработает при updateMany
            (val: number): boolean => validationRules.product.price.test(String(val))
        ]
    },
    discount: { // В процентах
        type: Number,
        required: true,
        min: 0,
        max: 100
    },
    category: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
        index: true
    },
    tags: { // Опционально
        type: [String],
        default: []
    },
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true // Автоматическое добавление полей createdAt и updatedAt
});

// Индексация по полному текстовому значению для каждого отдельного слова
// При поиске запрос разбивается на отдельные слова
// Документ находится, если хотя бы одно из слов полностью совпадает со словом из поля
// В пайплайне для агрегатора нужно устанавливать такой поиск первым
ProductSchema.index({
    sku: 'text',
    name: 'text',
    brand: 'text',
    tags: 'text'
}, {
    weights: {
        sku: 10,
        name: 5,
        brand: 3,
        tags: 2
    },
    name: 'TextSearchIndex',
    default_language: 'none'
});

// Плагин, собирающий все ошибки уникальности полей до выбрасывания исключения
ProductSchema.plugin(uniqueValidator);

const Product = model<TDbProduct>('Product', ProductSchema);

export default Product;
