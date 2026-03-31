import News from '@server/db/models/News.js';
import { checkTimeout } from '@server/middlewares/timeoutMiddleware.js';
import { prepareNews } from '@server/services/newsService.js';
import { typeCheck, validateInputTypes } from '@server/utils/typeValidation.js';
import { runInDbTransaction } from '@server/utils/dbUtils.js';
import { createAppError, prepareAppErrorData } from '@server/utils/errorUtils.js';
import { parseValidationErrors } from '@server/utils/errorUtils.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';

/// Загрузка всех новостей ///
export const handleNewsListRequest = async (req, res, next) => {
    const isAdmin = req.dbUser?.role === 'admin';
    const selectedDbFields = '_id publishDate title content' + (isAdmin ? ' createdBy updateHistory' : '');

    try {
        let dbNewsQuery = News.find() // Поиск всех новостей
            .sort({ publishDate: -1 }) // Сортировка от новой новости к старой
            .select(selectedDbFields); // Выборка только нужных полей

        if (isAdmin) { // Заполнение полей с именами пользователей по ссылкам на их _id в коллекции users
            dbNewsQuery = dbNewsQuery
                .populate('createdBy', 'name')
                .populate('updateHistory.updatedBy', 'name');
        }

        const dbNewsList = await dbNewsQuery.lean(); // Преобразование в обычный JS-объект
        checkTimeout(req);

        const newsList = dbNewsList.map(news => prepareNews(news, { managed: isAdmin }));

        safeSendResponse(res, 200, { message: 'Новости успешно загружены', newsList });
    } catch (err) {
        next(err);
    }
};

/*import { Request, Response, NextFunction } from 'express';
import { TDbNews } from '@server/types/index.js';

export const handleNewsListRequest = async (
    req: Request, 
    res: Response, 
    next: NextFunction
): Promise<void> => {
    const isAdmin = req.dbUser?.role === 'admin';
    const selectedDbFields = '_id publishDate title content' + (isAdmin ? ' createdBy updateHistory' : '');

    try {
        let dbNewsQuery: TDbNews = News.find().sort({ publishDate: -1 }).select(selectedDbFields);

        if (isAdmin) {
            dbNewsQuery = dbNewsQuery
                .populate('createdBy', 'name')
                .populate('updateHistory.updatedBy', 'name');
        }

        const dbNewsList: TDbNews = await dbNewsQuery.lean<TDbNews>();
        checkTimeout(req);

        const newsList = dbNewsList.map(news => prepareNews(news, { managed: isAdmin }));

        safeSendResponse(res, 200, { message: 'Новости успешно загружены', newsList });
    } catch (err) {
        next(toError(err));
    }
};*/

/// Загрузка отдельной новости для редактирования ///
export const handleNewsRequest = async (req, res, next) => {
    const newsId = req.params.newsId;

    if (!typeCheck.objectId(newsId)) {
        return safeSendResponse(res, 400, { message: 'Неверный формат данных: newsId' });
    }

    try {
        const dbNews = await News.findById(newsId).select('title content').lean();
        checkTimeout(req);

        if (!dbNews) {
            return safeSendResponse(res, 404, { message: `Новость (ID: ${newsId}) не найдена` });
        }

        safeSendResponse(res, 200, {
            message: `Новость "${dbNews.title}" успешно загружена`,
            news: prepareNews(dbNews)
        });
    } catch (err) {
        next(err);
    }
};

/// Создание новости ///
export const handleNewsCreateRequest = async (req, res, next) => {
    const userId = req.dbUser._id;
    const { title, content } = req.body ?? {};

    // Предварительная проверка формата данных
    const inputTypeMap = {
        title: { value: title, type: 'string', form: true },
        content: { value: content, type: 'string', form: true }
    };

    const { invalidInputKeys, fieldErrors } = validateInputTypes(inputTypeMap, 'news');

    if (invalidInputKeys.length > 0) {
        const invalidKeysStr = invalidInputKeys.join(', ');
        return safeSendResponse(res, 400, { message: `Неверный формат данных: ${invalidKeysStr}` });
    }
    if (Object.keys(fieldErrors).length > 0) {
        return safeSendResponse(res, 422, { message: 'Неверный формат данных', fieldErrors });
    }

    // Создание документа в базе MongoDB
    try {
        const { newsLbl } = await runInDbTransaction(async (session) => {
            const [newNews] = await News.create(
                [
                    {
                        title: title.trim(),
                        content: content.trim(),
                        createdBy: userId
                    }
                ],
                { session }
            );
            checkTimeout(req);

            return { newsLbl: newNews.title };
        });

        safeSendResponse(res, 201, { message: `Новость "${newsLbl}" успешно создана` });
    } catch (err) {
        // Обработка ошибок валидации полей
        if (err.name === 'ValidationError') {
            const { unknownFieldError, fieldErrors } = parseValidationErrors(err, 'news');
            if (unknownFieldError) return next(unknownFieldError);
        
            if (fieldErrors) {
                return safeSendResponse(res, 422, { message: 'Некорректные данные', fieldErrors });
            }
        }

        next(err);
    }
};

/// Изменение новости ///
export const handleNewsUpdateRequest = async (req, res, next) => {
    const userId = req.dbUser._id;
    const newsId = req.params.newsId;
    const { title, content } = req.body ?? {};

    // Предварительная проверка формата данных
    const inputTypeMap = {
        newsId: { value: newsId, type: 'objectId' },
        title: { value: title, type: 'string', form: true },
        content: { value: content, type: 'string', form: true }
    };

    const { invalidInputKeys, fieldErrors } = validateInputTypes(inputTypeMap, 'news');

    if (invalidInputKeys.length > 0) {
        const invalidKeysStr = invalidInputKeys.join(', ');
        return safeSendResponse(res, 400, { message: `Неверный формат данных: ${invalidKeysStr}` });
    }
    if (Object.keys(fieldErrors).length > 0) {
        return safeSendResponse(res, 422, { message: 'Неверный формат данных', fieldErrors });
    }

    // Апдейт документа в базе MongoDB
    try {
        const { newsLbl } = await runInDbTransaction(async (session) => {
            // Проверка на существование изменяемой новости
            const dbNews = await News.findById(newsId).session(session);
            checkTimeout(req);

            const newsLbl = dbNews ? `"${dbNews.title}"` : `(ID: ${newsId})`;
                    
            if (!dbNews) {
                throw createAppError(404, `Новость ${newsLbl} не найдена`);
            }

            // Установка новых данных и проверка их изменений
            dbNews.set({
                title: title.trim(),
                content: content.trim()
            });

            if (!dbNews.isModified()) {
                throw createAppError(204);
            }

            // Добавление лога редактирования и сохранение в базе MongoDB
            dbNews.updateHistory.push({ updatedBy: userId, updatedAt: new Date() });
            await dbNews.save({ session });
            checkTimeout(req);

            return { newsLbl };
        });

        safeSendResponse(res, 200, { message: `Новость "${newsLbl}" успешно изменена` });
    } catch (err) {
        // Обработка контролируемой ошибки
        if (err.isAppError) {
            return safeSendResponse(res, err.statusCode, prepareAppErrorData(err));
        }

        // Обработка ошибок валидации полей
        if (err.name === 'ValidationError') {
            const { unknownFieldError, fieldErrors } = parseValidationErrors(err, 'news');
            if (unknownFieldError) return next(unknownFieldError);
        
            if (fieldErrors) {
                return safeSendResponse(res, 422, { message: 'Некорректные данные', fieldErrors });
            }
        }

        next(err);
    }
};

/// Удаление новости ///
export const handleNewsDeleteRequest = async (req, res, next) => {
    const newsId = req.params.newsId;

    if (!typeCheck.objectId(newsId)) {
        return safeSendResponse(res, 400, { message: 'Неверный формат данных: newsId' });
    }

    try {
        const { newsLbl } = await runInDbTransaction(async (session) => {
            const dbNews = await News.findByIdAndDelete(newsId).session(session);
            checkTimeout(req);

            const newsLbl = dbNews ? `"${dbNews.title}"` : `(ID: ${newsId})`;
    
            if (!dbNews) {
                throw createAppError(404, `Новость ${newsLbl} не найдена`);
            }

            return { newsLbl };
        });

        safeSendResponse(res, 200, { message: `Новость ${newsLbl} успешно удалена` });
    } catch (err) {
        if (err.isAppError) {
            return safeSendResponse(res, err.statusCode, prepareAppErrorData(err));
        }

        next(err);
    }
};
