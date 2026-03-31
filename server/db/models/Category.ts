import { Schema, model } from 'mongoose';
import uniqueValidator from 'mongoose-unique-validator';
import { validationRules } from '@shared/fieldRules.js';
import { UNSORTED_CATEGORY_SLUG } from '@shared/constants.js';
import type { TDbCategory } from '@server/types/index.js';

export const CategorySchema = new Schema({
    name: {
        type: String,
        required: true,
        match: validationRules.category.name
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        match: validationRules.category.slug
    },
    order: { // Индексация от 0
        type: Number,
        min: 0,
        required: true
    },
    parent: {
        type: Schema.Types.ObjectId,
        ref: 'Category',
        default: null,
        index: true
    },
    restricted: {
        type: Boolean,
        default: false
    }
});

// Запрет удаления категории "Неотсортированные товары" ("unsorted")
CategorySchema.pre(
    'deleteOne',
    { document: true, query: false },
    function(next): void {
        if (this.slug === UNSORTED_CATEGORY_SLUG) {
            return next(new Error(`Категорию ${this.name} удалять нельзя`));
        }
        next();
    }
);

// Плагин, собирающий все ошибки уникальности полей до выбрасывания исключения
CategorySchema.plugin(uniqueValidator);

const Category = model<TDbCategory>('Category', CategorySchema);

export default Category;
