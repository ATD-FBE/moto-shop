import mongoose from 'mongoose';
import Category from './models/Category.js';
import config from '../config/config.js';
import log from '../utils/logger.js';
import { toError } from '../../shared/commonHelpers.js';
import { UNSORTED_CATEGORY_SLUG } from '../../shared/constants.js';

const createUnsortedCategory = async (): Promise<void> => {
    let unsortedCat = await Category.findOne({ slug: UNSORTED_CATEGORY_SLUG });

    if (!unsortedCat) {
        const maxOrderCategory = await Category.findOne({ parent: null }).sort('-order').limit(1);
        const unsortedOrder = maxOrderCategory ? maxOrderCategory.order + 1 : 0;
        
        unsortedCat = await Category.create({
            name: 'Неотсортированные товары',
            slug: UNSORTED_CATEGORY_SLUG,
            order: unsortedOrder,
            restricted: true
        });

        log.info(`Категория товаров "${unsortedCat.name}" успешно создана`);
    } else {
        log.info(`Категория товаров "${unsortedCat.name}" уже существует`);
    }
};

export const connectMongoDB = async (): Promise<void> => {
    try {
        await mongoose.connect(config.database.uri);
        await createUnsortedCategory();
        log.info('MongoDB подключён');
    } catch (err) {
        const error = toError(err);
        log.error('Ошибка подключения MongoDB:', error);
        throw error;
    }
};

export const disconnectMongoDB = async (): Promise<void> => {
    log.info(`Отключение MongoDB...`);

    try {
        await mongoose.disconnect();
        log.info('Соединение с MongoDB закрыто');
    } catch (err) {
        log.error('Ошибка закрытия соединения с MongoDB:', toError(err));
    }
};
