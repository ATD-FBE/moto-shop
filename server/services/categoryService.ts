import { Types } from 'mongoose';
import Category from '@server/db/models/Category.js';
import type { ClientSession } from 'mongoose';
import type { TDbCategory } from '@server/types/index.js';
import type { ICategory } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IDescendantAggregateResult {
    _id: Types.ObjectId;
    ancestors: TDbCategory[];
}

type TCategoriesToDeleteAggregateResult = TDbCategory & {
    descendants: TDbCategory[];
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export const prepareCategory = (dbCategory: TDbCategory): ICategory => ({
    id: dbCategory._id.toString(),
    name: dbCategory.name,
    slug: dbCategory.slug,
    order: dbCategory.order,
    parent: dbCategory.parent?.toString() ?? null,
    restricted: dbCategory.restricted
});

export const checkCategoryCircularDependency = async (
    categoryId: string,
    parentId: string,
    session?: ClientSession
): Promise<boolean> => {
    const aggregateResult = await Category.aggregate<IDescendantAggregateResult>([
        // Нахождение нового родителя (один документ в результате агрегатного запроса)
        { $match: { _id: Types.ObjectId.createFromHexString(parentId) } },

        // Поиск вверх по дереву от нового родителя по id и сбор всех его предков в массив
        {
            $graphLookup: {
                from: 'categories', // Имя коллекции, где осуществляется поиск
                startWith: '$parent', // Начало поиска со значения поля parent нового родителя
                connectFromField: 'parent', // Продолжение с поля parent найденных категорий
                connectToField: '_id', // Поле parent сопоставляется с _id других категорий
                as: 'ancestors' // Документы найденных предков помещаются в массив ancestors,
            }                   // который создаётся в документе результата агрегации
        },

        // Фильтрация массива результатов агрегатного запроса (содержит только нового родителя)
        { $match: { 'ancestors._id': Types.ObjectId.createFromHexString(categoryId) } }
    ]).session(session || null);

    return aggregateResult.length > 0;
};

export const getCategoryWithDescendants = async (
    categoryObjectId: Types.ObjectId,
    session?: ClientSession
): Promise<TCategoriesToDeleteAggregateResult | null> => {
    const aggregateResult = await Category.aggregate<TCategoriesToDeleteAggregateResult>([
        // Нахождение удаляемой категории (один документ в результате агрегатного запроса)
        { $match: { _id: categoryObjectId } },

        // Поиск вниз по дереву от удаляемой категории по id и сбор всех её потомков в массив
        {
            $graphLookup: {
                from: 'categories', // Имя коллекции, где осуществляется поиск
                startWith: '$_id', // Начало поиска со значения поля _id удаляемой категории
                connectFromField: '_id', // Продолжение с поля _id найденных категорий
                connectToField: 'parent', // Поле _id сопоставляется с полем parent других категорий
                as: 'descendants' // Документы найденных потомков помещаются в массив descendants,
            }                     // который создаётся в документе результата агрегатного запроса
        }
    ]).session(session || null);

    return aggregateResult[0] || null;
};
