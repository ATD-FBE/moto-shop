import { Types } from 'mongoose';
import Category from '@server/db/models/Category.js';
import Product from '@server/db/models/Product.js';
import { checkTimeout } from '@server/middlewares/timeoutMiddleware.js';
import {
    prepareCategory,
    checkCategoryCircularDependency,
    getCategoryWithDescendants
} from '@server/services/categoryService.js';
import { runInDbTransaction } from '@server/utils/dbUtils.js';
import { createAppError } from '@server/utils/errorUtils.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import { UNSORTED_CATEGORY_SLUG } from '@shared/constants.js';
import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { TDbCategory } from '@server/types/index.js';
import type {
    ICategoryBody,
    TCategoryListResponse,
    TCategoryCreateResponse,
    TCategoryUpdateResponse,
    TCategoryDeleteResponse
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface ICategoryParams extends ParamsDictionary {
    categoryId: string;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

/// Загрузка всех категорий ///
export const handleCategoryListRequest: RequestHandler<
    {},
    TCategoryListResponse
> = async (req, res, next) => {
    try {
        const dbCategoryList = await Category.find().lean<TDbCategory[]>();
        checkTimeout(req);

        const categoryList = dbCategoryList.map(cat => prepareCategory(cat));

        safeSendResponse(res, 200, { message: 'Категории товаров успешно загружены', categoryList });
    } catch (err) {
        next(err);
    }
};

/// Создание категории ///
export const handleCategoryCreateRequest: RequestHandler<
    {},
    TCategoryCreateResponse,
    ICategoryBody
> = async (req, res, next) => {
    const { name, slug, order, parent } = req.body;
    const orderNum = Number(order);

    try {
        const { newCategory, movedProductCount } = await runInDbTransaction(async (session) => {
            // Проверка родительской категории
            if (parent !== null) {
                const dbParentCategory = await Category.findById(parent).lean<TDbCategory>().session(session);
                checkTimeout(req);

                if (!dbParentCategory) {
                    throw createAppError(404, `Родительская категория товаров (ID: ${parent}) отсутствует`);
                }
                if (dbParentCategory.restricted) {
                    throw createAppError(
                        400,
                        `В категории товаров "${dbParentCategory.name}" нельзя создавать подкатегории`
                    );
                }
            }

            // Корректировка порядковых номеров создаваемой категории и её соседей (индексация от 0)
            const neighborCount = await Category.countDocuments({ parent }).session(session);
            checkTimeout(req);

            const correctedOrder = Math.min(Math.max(0, orderNum), neighborCount);

            if (neighborCount && correctedOrder < neighborCount) {
                await Category.updateMany(
                    { parent, order: { $gte: correctedOrder } }, // Поиск док-та с номером >= correctedOrder
                    { $inc: { order: 1 } }, // Инкремент поля order у найденных документов на 1
                    { session }
                );
                checkTimeout(req);
            }

            // Создание категории с корректированным номером
            const [createdCategory] = await Category.create(
                [
                    {
                        name: name.trim(),
                        slug: slug.trim().toLowerCase(),
                        order: correctedOrder,
                        parent
                    }
                ],
                { session }
            );
            checkTimeout(req);

            // Перемещение товаров родительской категории, если она была листовой
            const unsortedCategory = await Category.findOne({ slug: UNSORTED_CATEGORY_SLUG })
                .lean<TDbCategory>()
                .session(session);
            checkTimeout(req);

            if (!unsortedCategory) {
                throw createAppError(
                    500,
                    `Корневая категория с URL "${UNSORTED_CATEGORY_SLUG}" отсутствует в базе данных`
                );
            }

            const productsMovedResult = await Product.updateMany(
                { category: parent },
                { category: unsortedCategory._id },
                { session }
            );
            checkTimeout(req);

            return {
                newCategory: createdCategory,
                movedProductCount: productsMovedResult.modifiedCount
            };
        });

        // Транзакция успешно завершена - ответ клиенту об успехе
        safeSendResponse(res, 201, {
            message: `Категория товаров "${newCategory.name}" успешно создана`,
            newCategoryId: newCategory._id.toString(),
            movedProductCount
        });
    } catch (err) {
        next(err);
    }
};

/// Изменение категории ///
export const handleCategoryUpdateRequest: RequestHandler<
    ICategoryParams,
    TCategoryUpdateResponse,
    ICategoryBody
> = async (req, res, next) => {
    const categoryId = req.params.categoryId;
    const { name, slug, order, parent } = req.body;
    const orderNum = Number(order);

    // Проверка отличия родителя от самой категории
    if (parent === categoryId) {
        return safeSendResponse(res, 400, {
            message: 'Категория товаров не может быть родителем самой себя'
        });
    }

    try {
        const { categoryName, movedProductCount } = await runInDbTransaction(async (session) => {
            // Проверка существования изменяемой категории
            const dbCategory = await Category.findById(categoryId).session(session);
            checkTimeout(req);
            
            if (!dbCategory) {
                throw createAppError(404, `Категория товаров (ID: ${categoryId}) не найдена`);
            }

            const currentParent = dbCategory.parent?.toString() ?? null; // Строка ID или null
            const currentOrder = dbCategory.order; // Число
            let correctedOrder = orderNum;

            // Проверка родительской категории, если это не корень
            if (parent !== null) {
                const dbParentCategory = await Category.findById(parent).lean<TDbCategory>().session(session);
                checkTimeout(req);

                if (!dbParentCategory) {
                    throw createAppError(404, `Родительская категория товаров (ID: ${parent}) отсутствует`);
                }
                
                // Родительская категория меняется
                if (parent !== currentParent) {
                    // Проверка ограничений новой родительской категории
                    if (dbParentCategory.restricted) {
                        throw createAppError(
                            400,
                            `Категория товаров "${dbParentCategory.name}" не может иметь подкатегории`
                        );
                    }
                    
                    // Поиск новой родительской категории среди потомков изменяемой
                    const isRecursive = await checkCategoryCircularDependency(categoryId, parent, session);
                    checkTimeout(req);
                      
                    if (isRecursive) {
                        throw createAppError(400, 'Категория товаров не может быть вложена в своего потомка');
                    }
                }
            }

            // Корректировка порядковых номеров изменяемой категории и её соседей (индексация от 0)
            if (parent !== currentParent) { // Категория перемещается, номер влияет на старых и новых соседей
                // Попытка перемещения защищённой категории
                if (dbCategory.restricted) {
                    throw createAppError(400, `Категорию товаров "${dbCategory.name}" нельзя перемещать`);
                }

                // Сдвиг номера у старых соседей
                await Category.updateMany(
                    { parent: currentParent, order: { $gt: currentOrder } },
                    { $inc: { order: -1 } },
                    { session }
                );
                checkTimeout(req);

                // Сдвиг номера у новых соседей
                const neighborCount = await Category.countDocuments({ parent }).session(session);
                checkTimeout(req);

                correctedOrder = Math.min(Math.max(0, orderNum), neighborCount);

                if (neighborCount && correctedOrder < neighborCount) {
                    await Category.updateMany(
                        { parent, order: { $gte: correctedOrder } },
                        { $inc: { order: 1 } },
                        { session }
                    );
                    checkTimeout(req);
                }
            } else if (orderNum !== currentOrder) { // Категория остаётся на месте, но её номер меняется
                const neighborCount = await Category.countDocuments({ parent }).session(session);
                checkTimeout(req);

                correctedOrder = Math.min(Math.max(0, orderNum), neighborCount - 1);

                const rangeFilter = correctedOrder < currentOrder
                    ? { $gte: correctedOrder, $lt: currentOrder }
                    : { $gt: currentOrder, $lte: correctedOrder };
                const increment = correctedOrder < currentOrder ? 1 : -1;

                await Category.updateMany(
                    { parent, order: rangeFilter },
                    { $inc: { order: increment } },
                    { session }
                );
                checkTimeout(req);
            }

            // Установка новых данных и проверка их изменений
            dbCategory.set({
                name: name.trim(),
                slug: slug.trim().toLowerCase(),
                order: correctedOrder,
                parent
            });

            if (!dbCategory.isModified()) {
                throw createAppError(204);
            }
            
            // Сохранение в базе MongoDB
            await dbCategory.save({ session });
            checkTimeout(req);

            // Перемещение товаров новой родительской категории, если она была листовой
            let movedProductCount = 0;

            if (parent !== currentParent) {
                const unsortedCategory = await Category
                    .findOne({ slug: UNSORTED_CATEGORY_SLUG })
                    .session(session);
                checkTimeout(req);

                if (!unsortedCategory) {
                    throw createAppError(
                        500,
                        `Корневая категория с URL "${UNSORTED_CATEGORY_SLUG}" отсутствует в базе данных`
                    );
                }
    
                const productsMovedResult = await Product.updateMany(
                    { category: parent },
                    { category: unsortedCategory._id },
                    { session }
                );
                checkTimeout(req);

                movedProductCount = productsMovedResult.modifiedCount;
            }

            return { categoryName: dbCategory.name, movedProductCount };
        });

        // Транзакция успешно завершена - ответ клиенту об успехе
        safeSendResponse(res, 200, {
            message: `Категория товаров "${categoryName}" успешно изменена`,
            movedProductCount
        });
    } catch (err) {
        next(err);
    }
};

/// Удаление категории ///
export const handleCategoryDeleteRequest: RequestHandler<
    ICategoryParams,
    TCategoryDeleteResponse
> = async (req, res, next) => {
    const categoryId = req.params.categoryId;

    // Удаление документа в базе MongoDB с использованием транзакции
    // (удаляются все дочерние подкатегории, задеваются номера соседних с удаляемой категорий,
    // все товары удаляемой и дочерних подкатегорий переносятся в корневую категорию c URL "unsorted")
    try {
        const transactionResult = await runInDbTransaction(async (session) => {
            // Поиск удаляемой категории и всех её потомков
            const categoryObjectId = Types.ObjectId.createFromHexString(categoryId);
            const dbCategory = await getCategoryWithDescendants(categoryObjectId, session);
            checkTimeout(req);

            // Проверка существования изменяемой категории
            if (!dbCategory) {
                throw createAppError(404, `Категория товаров (ID: ${categoryId}) не найдена`);
            }
            if (dbCategory.restricted) {
                throw createAppError(400, `Категорию товаров "${dbCategory.name}" нельзя удалять`);
            }

            // Сдвиг номера у соседей
            const parent = dbCategory.parent ?? null; // ObjectId или null
            const order = dbCategory.order; // Число

            await Category.updateMany(
                { parent, order: { $gt: order } },
                { $inc: { order: -1 } },
                { session }
            );
            checkTimeout(req);

            // Удаление категории и всех её потомков
            const descendantCategories = dbCategory.descendants;
            const deletingCategoryObjIds = [categoryObjectId, ...descendantCategories.map(d => d._id)];

            const deleteResult = await Category.deleteMany(
                { _id: { $in: deletingCategoryObjIds } },
                { session }
            );
            checkTimeout(req);

            if (deleteResult.deletedCount !== deletingCategoryObjIds.length) {
                throw createAppError(
                    500,
                    'Удалено не всё дерево категорий. Возможна рассинхронизация данных.'
                );
            }

            // Перемещение товаров удалённых категорий в категорию неотсортированных товаров
            const unsortedCategory = await Category
                .findOne({ slug: UNSORTED_CATEGORY_SLUG })
                .session(session);
            checkTimeout(req);

            if (!unsortedCategory) {
                throw createAppError(
                    500,
                    `Корневая категория с URL "${UNSORTED_CATEGORY_SLUG}" отсутствует в базе данных`
                );
            }

            const productsMovedResult = await Product.updateMany(
                { category: { $in: deletingCategoryObjIds } },
                { category: unsortedCategory._id },
                { session }
            );
            checkTimeout(req);

            return {
                categoryName: dbCategory.name,
                descendantCatNames: descendantCategories.map(d => d.name),
                movedProductCount: productsMovedResult.modifiedCount
            };
        });

        const { categoryName, descendantCatNames, movedProductCount } = transactionResult;

        const message = `Категория товаров "${categoryName}" успешно удалена` +
            (descendantCatNames.length
                ? ` вместе со всеми её подкатегориями (${descendantCatNames.length}): "` +
                descendantCatNames.join('", "') + '"'
                : '');

        safeSendResponse(res, 200, { message, movedProductCount });
    } catch (err) {
        next(err);
    }
};
