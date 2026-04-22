import Promo from '@server/db/models/Promo.js';
import { BASE_DB_PROMO_FIELDS, MANAGED_DB_PROMO_FIELDS } from '@server/config/constants.js';
import { checkTimeout } from '@server/middlewares/timeoutMiddleware.js';
import { preparePromo } from '@server/services/promoService.js';
import { storageService } from '@server/services/storage/storageService.js';
import { requireDbUser } from '@server/utils/typeGuards.js';
import { runInDbTransaction } from '@server/utils/dbUtils.js';
import { createAppError } from '@server/utils/errorUtils.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import {
    DAY_IN_MS,
    MIN_IN_MS,
    USER_ROLE,
    MAX_TIMEZONE_OFFSET_MINUTES,
    PROMO_ANNOUNCE_OFFSET_DAYS
} from '@shared/constants.js';
import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { FilterQuery } from 'mongoose';
import type { TDbPromo, TDbPromoBase, TDbPromoManaged } from '@server/types/index.js';
import type {
    IPromoListQuery,
    TPromoListResponse,
    TPromoResponse,
    TPromoCreateBodyServer,
    TPromoCreateResponse,
    TPromoUpdateBodyServer,
    TPromoUpdateResponse,
    TPromoDeleteResponse
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IPromoParams extends ParamsDictionary {
    promoId: string;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

/// Загрузка всех акций ///
export const handlePromoListRequest: RequestHandler<
    {},
    TPromoListResponse,
    {},
    IPromoListQuery
> = async (req, res, next) => {
    const isAdmin = req.dbUser?.role === USER_ROLE.ADMIN;

    try {
        let dbPromoList: (TDbPromoBase | TDbPromoManaged)[] = [];

        if (isAdmin) {
            dbPromoList = await Promo.find()
                .sort({ createdAt: -1 })
                .select(MANAGED_DB_PROMO_FIELDS)
                .populate('createdBy', 'name')
                .populate('updateHistory.updatedBy', 'name')
                .lean<TDbPromoManaged[]>();
        } else {
            const { timestamp, timeZoneOffset } = req.query;
            const now = Date.now();

            let tsNum = Number(timestamp);
            if (isNaN(tsNum) || Math.abs(tsNum - now) > DAY_IN_MS) {
                tsNum = now;
            }

            let offsetNum = Number(timeZoneOffset);
            if (isNaN(offsetNum) || Math.abs(offsetNum) > MAX_TIMEZONE_OFFSET_MINUTES) {
                offsetNum = 0;
            }

            const clientDateTimeUTC = new Date(tsNum - offsetNum * MIN_IN_MS);
            const announceStart = new Date(clientDateTimeUTC);
            announceStart.setDate(announceStart.getDate() + PROMO_ANNOUNCE_OFFSET_DAYS);

            const findFilter: FilterQuery<TDbPromo> = {
                startDate: { $lte: announceStart }, // Дата анонса акции меньше текущего времени клиента
                endDate: { $gte: clientDateTimeUTC } // Дата конца акции больше текущего времени клиента
            };

            dbPromoList = await Promo.find(findFilter)
                .sort({ startDate: -1 })
                .select(BASE_DB_PROMO_FIELDS)
                .lean<TDbPromoBase[]>();
        }
        checkTimeout(req);

        const promoList = dbPromoList.map(promo => preparePromo(promo, { managed: isAdmin }));

        safeSendResponse(res, 200, { message: 'Акции успешно загружены', promoList });
    } catch (err) {
        next(err);
    }
};

/// Загрузка отдельной акции для редактирования ///
export const handlePromoRequest: RequestHandler<IPromoParams, TPromoResponse> = async (req, res, next) => {
    const promoId = req.params.promoId;

    try {
        const dbPromo = await Promo.findById(promoId).select(BASE_DB_PROMO_FIELDS).lean<TDbPromoBase>();
        checkTimeout(req);

        if (!dbPromo) {
            return safeSendResponse(res, 404, { message: `Акция (ID: ${promoId}) не найдена` });
        }

        safeSendResponse(res, 200, {
            message: `Акция "${dbPromo.title}" успешно загружена`,
            promo: preparePromo(dbPromo)
        });
    } catch (err) {
        next(err);
    }
};

/// Создание акции ///
export const handlePromoCreateRequest: RequestHandler<
    {},
    TPromoCreateResponse,
    TPromoCreateBodyServer
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const reqCtx = req.reqCtx;
    const userId = req.dbUser._id;
    const { file: image, fileUploadError } = req; // Проверено в multer
    const { title, description, startDate, endDate } = req.body;

    let newPromoId: string | null = null;

    // Создание документа в базе MongoDB
    try {
        const { promoLbl } = await runInDbTransaction(async (session) => {
            // Подготовка данных
            const prepDbFields: Partial<TDbPromo> = {
                title: title.trim(),
                imageFilename: image?.filename,
                description: description.trim()
            };

            const startDateUTC = new Date(startDate);
            startDateUTC.setUTCHours(0, 0, 0, 0); // Возвращает таймстемп, startDateUTC остаётся объектом
            prepDbFields.startDate = startDateUTC;

            const endDateUTC = new Date(endDate);
            endDateUTC.setUTCHours(23, 59, 59, 999); // Возвращает таймстемп, endDateUTC остаётся объектом
            prepDbFields.endDate = endDateUTC;

            // Предварительное создание документа для валидации до сохранения
            const newPromoDoc = new Promo(prepDbFields);

            // Отметка поля фотографий невалидным при ошибке в multer
            if (fileUploadError) {
                const { field, message } = fileUploadError; // field = 'image' - поле из формы
                newPromoDoc.invalidate(field, message);
            }

            // Отметка поля даты окончания акции невалидным, если оно раньше даты старта
            if (endDateUTC.getTime() < startDateUTC.getTime()) {
                newPromoDoc.invalidate('endDate', 'rangeError');
            }

            // Добавление лога создания и предварительная валидация до работы с файловой системой
            newPromoDoc.createdBy = userId;
            await newPromoDoc.validate();
            checkTimeout(req);

            // Сохранение картинки акции в хранилище файлов и добавление URL картинки в БД
            if (image) {
                newPromoId = newPromoDoc._id.toString(); // ID создался при валидации
                await storageService.savePromoImage(newPromoId, image);
                checkTimeout(req);
            }

            // Сохранение в базе MongoDB
            const newDbPromo = await newPromoDoc.save({ session });
            checkTimeout(req);

            return { promoLbl: `"${newDbPromo.title}"` };
        });

        // Отправка успешного ответа клиенту
        safeSendResponse(res, 201, { message: `Акция ${promoLbl} успешно создана` });
    } catch (err) {
        // Очистка файла изображения акции в хранилище (безопасно)
        if (image) {
            storageService.deleteTempFiles(image, reqCtx);
            storageService.cleanupPromoFiles(newPromoId, reqCtx);
        }

        next(err);
    }
};

/// Изменение акции ///
export const handlePromoUpdateRequest: RequestHandler<
    IPromoParams,
    TPromoUpdateResponse,
    TPromoUpdateBodyServer
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const reqCtx = req.reqCtx;
    const userId = req.dbUser._id;
    const promoId = req.params.promoId;
    const { file: image, fileUploadError } = req; // Проверено в multer
    const { title, description, startDate, endDate, removeImage } = req.body;

    const shouldRemoveImage = removeImage === 'true';
    const newImageFilename = image?.filename ?? null;
    let rollbackCleanupFiles = false;

    // Апдейт документа в базе MongoDB
    try {
        const { promoLbl, postUpdateFileCleanup } = await runInDbTransaction(async (session) => {
            // Проверка на существование изменяемой акции
            const dbPromo = await Promo.findById(promoId).session(session);
            checkTimeout(req);

            const promoLbl = dbPromo ? `"${dbPromo.title}"` : `(ID: ${promoId})`;
            
            if (!dbPromo) {
                throw createAppError(404, `Акция ${promoLbl} не найдена`);
            }

            const oldImageFilename = dbPromo.imageFilename;
            const hasImage = Boolean(oldImageFilename);
            rollbackCleanupFiles = !hasImage;
        
            // Проверка на согласованность флага удаления старого файла картинки и нового файла
            if (
                (hasImage && image && !shouldRemoveImage) ||
                (!hasImage && shouldRemoveImage)
            ) {
                throw createAppError(400, `Несогласованные данные для изображения акции ${promoLbl}`);
            }

            // Подготовка данных
            const prepDbFields: Partial<TDbPromo> = {
                title: title.trim(),
                description: description.trim()
            };

            dbPromo.imageFilename = oldImageFilename
                ? shouldRemoveImage ? newImageFilename : oldImageFilename
                : newImageFilename;

            const startDateUTC = new Date(startDate);
            startDateUTC.setUTCHours(0, 0, 0, 0); // Возвращает таймстемп, startDateUTC остаётся объектом
            prepDbFields.startDate = startDateUTC;

            const endDateUTC = new Date(endDate);
            endDateUTC.setUTCHours(23, 59, 59, 999); // Возвращает таймстемп, endDateUTC остаётся объектом
            prepDbFields.endDate = endDateUTC;

            // Установка новых данных и проверка их изменений
            dbPromo.set(prepDbFields);

            // Отметка поля фотографий невалидным при ошибке в multer
            if (fileUploadError) {
                const { field, message } = fileUploadError; // field = 'image' - поле из формы
                dbPromo.invalidate(field, message);
            }

            // Отметка поля даты окончания акции невалидным, если оно раньше даты старта
            if (endDateUTC.getTime() < startDateUTC.getTime()) {
                dbPromo.invalidate('endDate', 'rangeError');
            }

            // Предварительная валидация до работы с файловой системой
            await dbPromo.validate();
            checkTimeout(req);
            
            // isModified() проверяет только новые данные. При fileUploadError данные могут совпасть
            if (!dbPromo.isModified() && !fileUploadError) {
                throw createAppError(204);
            }

            // Сохранение нового файла картинки в хранилище файлов, если есть
            if (image) {
                await storageService.savePromoImage(promoId, image);
                checkTimeout(req);
            }
            
            // Добавление лога редактирования и сохранение в базе MongoDB
            dbPromo.updateHistory.push({ updatedBy: userId, updatedAt: new Date() });
            await dbPromo.save({ session });
            checkTimeout(req);

            // Подготовка данных для удаления файлов
            const postUpdateFileCleanup = shouldRemoveImage && oldImageFilename
                ? {
                    filename: oldImageFilename,
                    fullCleanup: !image
                }
                : null;

            return { promoLbl, postUpdateFileCleanup };
        });

        // Отправка успешного ответа клиенту
        safeSendResponse(res, 200, { message: `Акция "${promoLbl}" успешно изменена` });

        // Удаление старого файла картинки или папки файлов акции (безопасно)
        if (postUpdateFileCleanup) {
            if (postUpdateFileCleanup.fullCleanup) {
                storageService.cleanupPromoFiles(promoId, reqCtx);
            } else {
                storageService.deletePromoImage(promoId, postUpdateFileCleanup.filename, reqCtx);
            }
        }
    } catch (err) {
        // Очистка нового файла изображения акции (безопасно)
        if (image) {
            storageService.deleteTempFiles(image, reqCtx);

            if (rollbackCleanupFiles) {
                storageService.cleanupPromoFiles(promoId, reqCtx);
            } else {
                storageService.deletePromoImage(promoId, newImageFilename, reqCtx);
            }
        }

        next(err);
    }
};

/// Удаление акции ///
export const handlePromoDeleteRequest: RequestHandler<
    IPromoParams,
    TPromoDeleteResponse
> = async (req, res, next) => {
    const reqCtx = req.reqCtx;
    const promoId = req.params.promoId;

    try {
        const dbPromo = await Promo.findByIdAndDelete(promoId);
        checkTimeout(req);

        const promoLbl = dbPromo ? `"${dbPromo.title}"` : `(ID: ${promoId})`;

        if (!dbPromo) {
            safeSendResponse(res, 404, { message: `Акция ${promoLbl} не найдена` });
        } else {
            safeSendResponse(res, 200, { message: `Акция ${promoLbl} успешно удалена` });
        }

        // Удаление файла изображения акции, если он есть (безопасно)
        storageService.cleanupPromoFiles(promoId, reqCtx);
    } catch (err) {
        next(err);
    }
};
