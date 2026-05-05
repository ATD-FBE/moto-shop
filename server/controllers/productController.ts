import { Types } from 'mongoose';
import Product from '@server/db/models/Product.js';
import Category from '@server/db/models/Category.js';
import { DEFAULT_SEARCH_TYPE, AGGREGATE_COLLATION_OPTIONS } from '@server/config/constants.js';
import { checkTimeout } from '@server/middlewares/timeoutMiddleware.js';
import { storageService } from '@server/services/storage/storageService.js';
import {
    prepareProduct,
    cleanupBulkProductFiles,
    redistributeProductProportionallyInOrderDrafts,
    buildProductsComputedFields,
    buildCategoriesPipeline
} from '@server/services/productService.js';
import {
    buildSearchMatch,
    buildFilterMatch,
    buildPaginatedPipeline,
    buildOrderedFiltersPipeline
} from '@server/utils/aggregationUtils.js';
import { requireDbUser, requireFileArrayField } from '@server/utils/typeGuards.js';
import { isArrayContentDifferent } from '@server/utils/compareUtils.js';
import { runInDbTransaction } from '@server/utils/dbUtils.js';
import { createAppError } from '@server/utils/errorUtils.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import { productCatalogFilterOptions, productEditorFilterOptions } from '@shared/filterOptions.js';
import { productCatalogSortOptions, productEditorSortOptions } from '@shared/sortOptions.js';
import { productsPageLimitOptions, productEditorPageLimitOptions } from '@shared/pageLimitOptions.js';
import { USER_ROLE, PRODUCTS_PAGE_CONTEXT, PRODUCT_FILES_LIMIT, REQUEST_STATUS } from '@shared/constants.js';
import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { FilterQuery } from 'mongoose';
import type { TDbProduct, TDbProductView, TDbCategory } from '@server/types/index.js';
import type {
    TProductListFilterParams,
    TProductListQuery,
    TProductListResponse,
    TProductResponse,
    TProductCreateBodyServer,
    TProductCreateResponse,
    TProductUpdateBodyServer,
    TProductUpdateResponse,
    IBulkProductUpdateBody,
    TBulkProductUpdateResponse,
    TProductDeleteResponse,
    IBulkProductDeleteBody,
    TBulkProductDeleteResponse
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IProductListAggregateResult {
    filteredProductIdList: { _id: Types.ObjectId }[];
    paginatedProductList: TDbProductView[];
}

interface IProductParams extends ParamsDictionary {
    productId: string;
}

type TProductArrayField = 'imageFilenames' | 'tags';

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

/// Загрузка ID отфильтрованных товаров и их данных для одной страницы ///
export const handleProductListRequest: RequestHandler<
    {},
    TProductListResponse,
    {},
    TProductListQuery
> = async (req, res, next) => {
    const isAdmin = req.dbUser?.role === USER_ROLE.ADMIN;
    const isEditor = req.query.pageContext === PRODUCTS_PAGE_CONTEXT.EDITOR;

    // Определение опций фильтрации
    const filterOptions = isAdmin && isEditor ? productEditorFilterOptions : productCatalogFilterOptions;
    const sortOptions = isAdmin && isEditor ? productEditorSortOptions : productCatalogSortOptions;
    const pageLimitOptions = isAdmin && isEditor ? productEditorPageLimitOptions : productsPageLimitOptions;

    // Создание вычисляемых полей для фильтра
    const computedFields = buildProductsComputedFields(req.query);

    // Настройка фильтра поиска
    const allowedSearchFields = ['sku', 'name', 'brand', 'tags'] as const;
    const searchMatch = buildSearchMatch<TDbProductView>(
        req.query.search,
        allowedSearchFields,
        DEFAULT_SEARCH_TYPE
    );

    // Настройка фильтра по параметрам
    const filterMatch = buildFilterMatch<TDbProductView, TProductListFilterParams>(req.query, filterOptions);

    // Настройка фильтра категорий
    const categoriesPipeline = await buildCategoriesPipeline(req.query.category);

    // Установка порядка всех фильтров в зависимости от типа поиска
    const allFiltersPipeline = buildOrderedFiltersPipeline({
        computedFields,
        searchMatch,
        filterMatch,
        extraFilters: categoriesPipeline
    });

    // Пайплайн вывода ID всех отфильтрованных результатов
    const filteredPipeline = [{ $project: { _id: 1 } }];

    // Пайплайн вывода результатов на странице
    const paginatedPipeline = buildPaginatedPipeline<TDbProductView>(req.query, sortOptions, pageLimitOptions);

    // Сборка пайплайна для агрегатора
    const pipeline = [
        ...allFiltersPipeline, // Фильтры
        {
            $facet: { // Сбор результатов
                filteredProductIdList: filteredPipeline,
                paginatedProductList: paginatedPipeline
            }
        }
    ];

    try {
        // Агрегатный запрос с информацией для отладки
        //const explainResult = await Product.aggregate(pipeline).explain('executionStats');
        //console.dir(explainResult.stages[0].$cursor, { depth: null });

        // Агрегатный запрос
        const aggregateResult = await Product
            .aggregate<IProductListAggregateResult>(pipeline)
            .collation(AGGREGATE_COLLATION_OPTIONS);
        checkTimeout(req);
        
        const filteredProductIdList = aggregateResult[0]?.filteredProductIdList.map(c =>
            c._id.toString()
        ) || [];
        const dbPaginatedProductList = aggregateResult[0]?.paginatedProductList || [];

        const requestTime = Date.now();
        const paginatedProductList = dbPaginatedProductList.map(product => prepareProduct(product, {
            managed: isAdmin,
            now: requestTime
        }));

        safeSendResponse(res, 200, {
            message: 'Товары успешно загружены',
            ...(isAdmin && isEditor 
                ? { filteredProductIdList }
                : { productsCount: filteredProductIdList.length }),
            paginatedProductList
        });
    } catch (err) {
        next(err);
    }
};

/// Загрузка отдельного товара на его странице ///
export const handleProductRequest: RequestHandler<
    IProductParams,
    TProductResponse
> = async (req, res, next) => {
    const isAdmin = req.dbUser?.role === USER_ROLE.ADMIN;
    const productId = req.params.productId;

    try {
        const dbProduct = await Product.findById(productId).lean<TDbProduct>();
        checkTimeout(req);

        if (!dbProduct) {
            return safeSendResponse(res, 404, { message: `Товар (ID: ${productId}) не найден` });
        }

        safeSendResponse(res, 200, {
            message: 'Товар успешно загружен',
            product: prepareProduct(dbProduct, { managed: isAdmin })
        });
    } catch (err) {
        next(err);
    }
};

/// Создание товара ///
export const handleProductCreateRequest: RequestHandler<
    {},
    TProductCreateResponse,
    TProductCreateBodyServer
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;
    if (!requireFileArrayField('images', req, next)) return;

    console.log(req.body);

    const reqCtx = req.reqCtx;
    const userId = req.dbUser._id;
    const {
        images, mainImageIndex, sku, name, brand, description,
        stock, unit, price, discount, category, tags, isActive
    } = req.body;
    const { fileUploadError } = req; // Проверено в multer

    // Проверка на согласованность индекса и количества фотографий
    const noImages = images.length === 0;
    const indexOutOfRange = (mainImageIndex ?? 0) >= images.length;

    if (
        (images.length > 0 && mainImageIndex === undefined) ||
        (!fileUploadError && mainImageIndex !== undefined && (noImages || indexOutOfRange))
    ) {
        return safeSendResponse(res, 400, { message: 'Несогласованные данные для фотографий товара' });
    }
    
    // Создание документа нового товара
    let newProductId: string | null = null;

    try {
        const { newDbProduct } = await runInDbTransaction(async (session) => {
            // Проверка на существование категории товара
            const dbCategory = await Category.findById(category).lean<TDbCategory>().session(session);
            checkTimeout(req);
                
            if (!dbCategory) {
                throw createAppError(404, `Категория товаров (ID: ${category}) не найдена`);
            }

            // Проверка того, что категория товара не имеет подкатегорий
            const hasSubcategories = await Category.exists({ parent: category }).session(session);
            checkTimeout(req);

            if (hasSubcategories) {
                throw createAppError(
                    400,
                    `Категория "${dbCategory.name}" не является конечной и не может содержать товар`
                );
            }

            // Подготовка данных
            const prepDbFields = {
                imageFilenames: images.map(img => img.filename),
                mainImageIndex: mainImageIndex !== undefined ? mainImageIndex : null,
                sku: sku?.trim() || null,
                name: name.trim(),
                brand: brand?.trim() || null,
                description: description?.trim() || null,
                stock,
                reserved: 0,
                unit,
                price,
                discount,
                category,
                tags: [...new Set(tags?.split(',').map(tag => tag.trim()).filter(Boolean) ?? [])],
                isActive,
                createdBy: userId
            };

            // Предварительное создание документа для валидации до сохранения
            const newProductDoc = new Product(prepDbFields);

            // Инвалидация файлового поля при ошибке загрузки
            if (fileUploadError) {// Отметка поля фотографий невалидным при ошибке в multer
                const { field, message } = fileUploadError; // field = 'images' - поле из формы
                newProductDoc.invalidate(field, message);
            }

            // Предварительная валидация до работы с файловой системой
            await newProductDoc.validate();
            checkTimeout(req);

            // Создание иконок и сохранение всех файлов фотографий в хранилище
            if (images.length > 0) {
                newProductId = newProductDoc._id.toString(); // ID создался при валидации
                await storageService.saveProductImages(newProductId, images);
                checkTimeout(req);
            }

            // Сохранение документа товара
            const newDbProduct = await newProductDoc.save({ session });
            checkTimeout(req);

            return { newDbProduct };
        });

        // Отправка успешного ответа клиенту
        safeSendResponse(res, 201, {
            message: `Товар "${newDbProduct.name}" успешно создан`,
            newProduct: prepareProduct(newDbProduct, { managed: true })
        });
    } catch (err) {
        // Очистка файлов фотографий товара в хранилище (безопасно)
        if (images.length > 0) {
            storageService.deleteTempFiles(images, reqCtx);
            storageService.cleanupProductFiles(newProductId, reqCtx);
        }

        next(err);
    }
};

/// Изменение товара ///
export const handleProductUpdateRequest: RequestHandler<
    IProductParams,
    TProductUpdateResponse,
    TProductUpdateBodyServer
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;
    if (!requireFileArrayField('images', req, next)) return;

    console.log(req.body);

    const reqCtx = req.reqCtx;
    const userId = req.dbUser._id;
    const productId = req.params.productId;
    const {
        images, mainImageIndex, imageFilenamesToDelete, sku, name, brand, description,
        stock, unit, price, discount, category, tags, isActive
    } = req.body;
    const { fileUploadError } = req; // Проверено в multer

    const newImageFilenames = images.map(img => img.filename);
    let rollbackCleanupFiles = false;

    try {
        const transactionResult = await runInDbTransaction(async (session) => {
            // Проверка на существование изменяемого товара
            const dbProduct = await Product.findById(productId).session(session);
            checkTimeout(req);

            const prodLbl = dbProduct ? `"${dbProduct.name}"` : `(ID: ${productId})`;
                
            if (!dbProduct) {
                throw createAppError(404, `Товар ${prodLbl} не найден`);
            }

            const oldImageFilenames = dbProduct.imageFilenames;
            rollbackCleanupFiles = !oldImageFilenames.length;

            // Проверки новой катагории товара
            if (category !== dbProduct.category.toString()) {
                // Проверка на существование категории товара
                const dbCategory = await Category.findById(category).lean<TDbCategory>().session(session);
                checkTimeout(req);
                            
                if (!dbCategory) {
                    throw createAppError(404, `Категория товаров (ID: ${category}) не найдена`);
                }

                // Проверка того, что категория товара не имеет подкатегорий
                const hasSubcategories = await Category.exists({ parent: category }).session(session);
                checkTimeout(req);

                if (hasSubcategories) {
                    throw createAppError(
                        400,
                        `Категория "${dbCategory.name}" не является конечной и не может содержать товар`
                    );
                }
            }

            // Фильтрация и подготовка имён файлов фотографий
            const actualImgFilenamesToDelete = imageFilenamesToDelete
                .filter(filename => oldImageFilenames.includes(filename));
            const imgFilenamesToDeleteSet = new Set(actualImgFilenamesToDelete);
            const preparedImgFilenames = oldImageFilenames
                .filter(filename => !imgFilenamesToDeleteSet.has(filename))
                .concat(newImageFilenames);

            // Проверка на согласованность индекса и изменённого количества фотографий
            const noImages = preparedImgFilenames.length === 0;
            const indexOutOfRange = (mainImageIndex ?? 0) >= preparedImgFilenames.length;

            if (
                (preparedImgFilenames.length > 0 && mainImageIndex === undefined) ||
                (!fileUploadError && mainImageIndex !== undefined && (noImages || indexOutOfRange))
            ) {
                throw createAppError(400, `Несогласованные данные для фотографий товара ${prodLbl}`);
            }

            // Подготовка данных
            const hasRestock = stock > dbProduct.stock;
            const hasReservedOverflow = stock < dbProduct.reserved;

            const prepDbFields = {
                mainImageIndex: mainImageIndex ?? null,
                sku: sku?.trim() || null,
                name: name.trim(),
                brand: brand?.trim() || null,
                description: description?.trim() || null,
                stock,
                reserved: Math.min(stock, dbProduct.reserved),
                ...(hasRestock && { lastRestockAt: new Date() }),
                unit,
                price,
                discount,
                category,
                isActive
            };

            const preparedTags = [...new Set(tags?.split(',').map(tag => tag.trim()).filter(Boolean) ?? [])];

            // Проверка на изменение и установка в документ массивов фотографий и тегов
            const arrayFieldsToUpdate: [TProductArrayField, string[]][] = [
                ['imageFilenames', preparedImgFilenames],
                ['tags', preparedTags]
            ];

            arrayFieldsToUpdate.forEach(([field, newArray]) => {
                const oldArray = dbProduct[field];
                const isFieldChanged = isArrayContentDifferent(oldArray, newArray);

                if (isFieldChanged) {
                    dbProduct[field] = newArray;
                    dbProduct.markModified(field);
                }
            });

            // Установка значений остальных полей
            dbProduct.set(prepDbFields);

            // Проверка изменений. При fileUploadError данные могут совпасть
            if (!dbProduct.isModified() && !fileUploadError) {
                throw createAppError(204);
            }

            // Инвалидация файлового поля при ошибке загрузки и превышение лимита общего кол-ва фотографий
            if (fileUploadError) { // Отметка поля фотографий невалидным при ошибке в multer
                const { field, message } = fileUploadError; // field = 'images' - поле из формы
                dbProduct.invalidate(field, message);
            }
            if (preparedImgFilenames.length > PRODUCT_FILES_LIMIT) {
                dbProduct.invalidate('images', 'Превышен лимит фотографий товара');
            }

            // Предварительная валидация до работы с файловой системой
            // Массивы исключены, так как проверены ранее отдельно
            await dbProduct.validate({ pathsToSkip: ['imageFilenames', 'tags'] });
            checkTimeout(req);

            // Создание иконок и сохранение всех новых файлов фотографий в хранилище
            if (images.length > 0) {
                await storageService.saveProductImages(productId, images);
                checkTimeout(req);
            }

            // Добавление лога редактирования и сохранение в базе MongoDB с валидацией полей
            dbProduct.updatedBy = userId;
            const updatedDbProduct = await dbProduct.save({ session });
            checkTimeout(req);

            // Пропорциональное распределение зарезервированных товаров среди клиентов, оформляющих заказ
            if (hasReservedOverflow) {
                await redistributeProductProportionallyInOrderDrafts(productId, stock, session);
                checkTimeout(req);
            }

            // Подготовка данных для удаления файлов
            const postUpdateFileCleanup = actualImgFilenamesToDelete.length > 0
                ? {
                    filenames: actualImgFilenamesToDelete,
                    fullCleanup: preparedImgFilenames.length === 0
                }
                : null;

            return { prodLbl, updatedDbProduct, postUpdateFileCleanup };
        });

        const { prodLbl, updatedDbProduct, postUpdateFileCleanup } = transactionResult;

        // Отправка успешного ответа клиенту
        safeSendResponse(res, 200, {
            message: `Товар "${prodLbl}" успешно обновлён`,
            updatedProduct: prepareProduct(updatedDbProduct, { managed: true })
        });

        // Удаление выбранных файлов старых фотографий товара (безопасно)
        if (postUpdateFileCleanup) {
            if (postUpdateFileCleanup.fullCleanup) {
                storageService.cleanupProductFiles(productId, reqCtx);
            } else {
                storageService.deleteProductImages(productId, postUpdateFileCleanup.filenames, reqCtx);
            }
        }
    } catch (err) {
        // Очистка новых файлов фотографий товара (безопасно)
        if (images.length > 0) {
           storageService.deleteTempFiles(images, reqCtx);

            if (rollbackCleanupFiles) {
                storageService.cleanupProductFiles(productId, reqCtx);
            } else {
                storageService.deleteProductImages(productId, newImageFilenames, reqCtx);
            }
        }

        next(err);
    }
};

/// Изменение группы товаров ///
export const handleBulkProductUpdateRequest: RequestHandler<
    {},
    TBulkProductUpdateResponse,
    IBulkProductUpdateBody
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const userId = req.dbUser._id;
    const { productIds, formFields } = req.body;
    const { brand, unit, discount, category, tags, isActive } = formFields;

    // Проверка выбранных товаров для апдейта
    const uniqueProductIds = [...new Set(productIds)];
    const totalProductIds = uniqueProductIds.length;

    if (!totalProductIds) {
        return safeSendResponse(res, 400, {
            message: 'Товары для изменения не выбраны',
            reason: REQUEST_STATUS.NO_SELECTION
        });
    }
    
    // Проверка выбранных полей для апдейта
    const fieldsToUpdate = [brand, unit, discount, category, tags, isActive];
    const hasFieldsToUpdate = fieldsToUpdate.some(f => f !== undefined);

    if (!hasFieldsToUpdate) {
        return safeSendResponse(res, 204);
    }

    try {
        const transactionResult = await runInDbTransaction(async (session) => {
            // Обработка категории
            if (category !== undefined) {
                // Проверка на существование категории товара
                const dbCategory = await Category.findById(category).lean<TDbCategory>().session(session);
                checkTimeout(req);
                            
                if (!dbCategory) {
                    throw createAppError(404, `Категория товаров (ID: ${category}) не найдена`);
                }

                // Проверка того, что категория товара не имеет подкатегорий
                const hasSubcategories = await Category.exists({ parent: category }).session(session);
                checkTimeout(req);

                if (hasSubcategories) {
                    throw createAppError(
                        400,
                        `Категория "${dbCategory.name}" не является конечной и не может содержать товар`
                    );
                }
            }

            // Подготовка данных
            const updateQuery: FilterQuery<TDbProduct> = { $set: {}, $unset: {} };

            if (brand !== undefined) {
                const trimmedBrand = brand.trim();

                if (trimmedBrand) {
                    updateQuery.$set.brand = trimmedBrand;
                } else {
                    updateQuery.$unset.brand = 1;
                }
            }

            if (unit !== undefined) updateQuery.$set.unit = unit;
            if (discount !== undefined) updateQuery.$set.discount = discount;
            if (category !== undefined) updateQuery.$set.category = category;
            if (tags !== undefined) {
                updateQuery.$set.tags = [...new Set(tags.split(',').map(t => t.trim()).filter(Boolean))];
            }
            if (isActive !== undefined) updateQuery.$set.isActive = isActive;

            updateQuery.$set.updatedBy = userId;
        
            // Сохранение в базе MongoDB с валидацией полей
            const updateResult = await Product.updateMany(
                { _id: { $in: uniqueProductIds } },
                updateQuery,
                { session, runValidators: true } // Валидация изменяемых полей на каждом документе вкл.
            );
            checkTimeout(req);

            const { matchedCount, modifiedCount } = updateResult;

            // Отправка ответов клиенту
            if (matchedCount === 0) {
                throw createAppError(404, 'Ни один товар не найден');
            }
            if (modifiedCount === 0) { // Не срабатывает из-за изменения updatedAt
                throw createAppError(204);
            }

            // Сбор данных по всем обновлённым документам
            const dbUpdatedProducts = await Product
                .find({ _id: { $in: uniqueProductIds } })
                .lean<TDbProduct[]>()
                .session(session);
            checkTimeout(req);

            const now = Date.now();
            const updatedProducts = dbUpdatedProducts.map(product => prepareProduct(product, {
                managed: true,
                now
            }));

            if (matchedCount < totalProductIds) {
                return {
                    statusCode: 207,
                    responseData: {
                        message: `Товары частично обновлены: ${modifiedCount} из ${totalProductIds}`,
                        updatedProducts
                    }
                };
            }

            return {
                statusCode: 200,
                responseData: {
                    message: 'Все выбранные товары успешно обновлены',
                    updatedProducts
                }
            };
        });

        const { statusCode, responseData } = transactionResult;

        safeSendResponse(res, statusCode, responseData);
    } catch (err) {
        next(err);
    }
};

/// Удаление товара ///
export const handleProductDeleteRequest: RequestHandler<
    IProductParams,
    TProductDeleteResponse
> = async (req, res, next) => {
    const reqCtx = req.reqCtx;
    const productId = req.params.productId;

    try {
        // Поиск и удаление документа в базе MongoDB
        const dbProduct = await Product.findByIdAndDelete(productId).lean<TDbProduct>();
        checkTimeout(req);

        if (!dbProduct) {
            return safeSendResponse(res, 404, { message: `Товар (ID: ${productId}) не найден` });
        }

        safeSendResponse(res, 200, { message: `Товар "${dbProduct.name}" успешно удалён` });

        // Удаление файлов фотографий товара, если они были (безопасно)
        storageService.cleanupProductFiles(productId, reqCtx);
    } catch (err) {
        next(err);
    }
};

/// Удаление группы товаров ///
export const handleBulkProductDeleteRequest: RequestHandler<
    {},
    TBulkProductDeleteResponse,
    IBulkProductDeleteBody
> = async (req, res, next) => {
    const reqCtx = req.reqCtx;
    const { productIds } = req.body;

    const uniqueProductIds = [...new Set(productIds)];
    const totalProductIds = uniqueProductIds.length;

    if (!totalProductIds) {
        return safeSendResponse(res, 400, {
            message: 'Товары для удаления не выбраны',
            reason: REQUEST_STATUS.NO_SELECTION
        });
    }

    try {
        const transactionResult = await runInDbTransaction(async (session) => {
            // Поиск и сбор ID удаляемых товаров
            const existingDbProducts = await Product
                .find({ _id: { $in: uniqueProductIds } }, '_id')
                .lean<TDbProduct[]>()
                .session(session);
            checkTimeout(req);

            if (!existingDbProducts.length) {
                throw createAppError(404, 'Ни один товар не найден');
            }

            // Поиск по ID и удаление документов в базе MongoDB
            const existingProductObjIds = existingDbProducts.map(dbProd => dbProd._id);
            const deletionResult = await Product
                .deleteMany({ _id: { $in: existingProductObjIds } })
                .session(session);
            checkTimeout(req);

            // Подготовка успешных ответов
            const { deletedCount } = deletionResult;

            if (deletedCount < totalProductIds) {
                return {
                    statusCode: 207,
                    responseData: {
                        message: `Некоторые товары не найдены. Удалено: ${deletedCount} из ${totalProductIds}`
                    }
                };
            }

            return {
                statusCode: 200,
                responseData: { message: 'Все товары успешно удалены' }
            };
        });

        const { statusCode, responseData } = transactionResult;

        safeSendResponse(res, statusCode, responseData);

        // Удаление файлов фотографий товара, если они есть (безопасно)
        cleanupBulkProductFiles(uniqueProductIds, reqCtx);
    } catch (err) {
        next(err);
    }
};
