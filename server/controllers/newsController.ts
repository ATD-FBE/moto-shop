import News from '@server/db/models/News.js';
import { BASE_DB_NEWS_FIELDS, MANAGED_DB_NEWS_FIELDS } from '@server/config/constants.js';
import { checkTimeout } from '@server/middlewares/timeoutMiddleware.js';
import { prepareNews } from '@server/services/newsService.js';
import { requireDbUser } from '@server/utils/typeGuards.js';
import { runInDbTransaction } from '@server/utils/dbUtils.js';
import { createAppError } from '@server/utils/errorUtils.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import { USER_ROLE } from '@shared/constants.js';
import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { TDbNews, TDbNewsBase, TDbNewsManaged } from '@server/types/index.js';
import type {
    INewsBody,
    TNewsListResponse,
    TNewsResponse,
    TNewsCreateResponse,
    TNewsUpdateResponse,
    TNewsDeleteResponse
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface INewsParams extends ParamsDictionary {
    newsId: string;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

/// Загрузка всех новостей ///
export const handleNewsListRequest: RequestHandler<{}, TNewsListResponse> = async (req, res, next) => {
    const isAdmin = req.dbUser?.role === USER_ROLE.ADMIN;
    const selectedDbFields = isAdmin ? MANAGED_DB_NEWS_FIELDS : BASE_DB_NEWS_FIELDS;

    try {
        let dbNewsList: (TDbNewsBase | TDbNewsManaged)[] = [];
        let dbNewsQuery = News.find() // Поиск всех новостей
            .sort({ publishDate: -1 }) // Сортировка от новой новости к старой
            .select(selectedDbFields); // Выборка только нужных полей

        if (isAdmin) { // Заполнение полей с именами пользователей по ссылкам на их _id в коллекции users
            dbNewsList = await dbNewsQuery
                .populate('createdBy', 'name')
                .populate('updateHistory.updatedBy', 'name')
                .lean<TDbNewsManaged[]>();
        } else {
            dbNewsList = await dbNewsQuery.lean<TDbNewsBase[]>();
        }

        checkTimeout(req);

        const newsList = dbNewsList.map(news => prepareNews(news, { managed: isAdmin }));

        safeSendResponse(res, 200, { message: 'Новости успешно загружены', newsList });
    } catch (err) {
        next(err);
    }
};

/// Загрузка отдельной новости для редактирования ///
export const handleNewsRequest: RequestHandler<INewsParams, TNewsResponse> = async (req, res, next) => {
    const newsId = req.params.newsId;

    try {
        const dbNews = await News.findById(newsId).select(BASE_DB_NEWS_FIELDS).lean<TDbNewsBase>();
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
export const handleNewsCreateRequest: RequestHandler<
    {},
    TNewsCreateResponse,
    INewsBody
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const userId = req.dbUser._id;
    const { title, content } = req.body;

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
        next(err);
    }
};

/// Изменение новости ///
export const handleNewsUpdateRequest: RequestHandler<
    INewsParams,
    TNewsUpdateResponse,
    INewsBody
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const userId = req.dbUser._id;
    const newsId = req.params.newsId;
    const { title, content } = req.body;

    try {
        const { newsLbl } = await runInDbTransaction(async (session) => {
            const dbNews = await News.findById(newsId).session(session);
            checkTimeout(req);

            const newsLbl = dbNews ? `"${dbNews.title}"` : `(ID: ${newsId})`;
                    
            if (!dbNews) {
                throw createAppError(404, `Новость ${newsLbl} не найдена`);
            }

            dbNews.set({
                title: title.trim(),
                content: content.trim()
            });

            if (!dbNews.isModified()) {
                throw createAppError(204);
            }

            dbNews.updateHistory.push({ updatedBy: userId, updatedAt: new Date() });
            await dbNews.save({ session });
            checkTimeout(req);

            return { newsLbl };
        });

        safeSendResponse(res, 200, { message: `Новость "${newsLbl}" успешно изменена` });
    } catch (err) {
        next(err);
    }
};

/// Удаление новости ///
export const handleNewsDeleteRequest: RequestHandler<
    INewsParams,
    TNewsDeleteResponse
> = async (req, res, next) => {
    const newsId = req.params.newsId;

    try {
        const { newsLbl } = await runInDbTransaction(async (session) => {
            const dbNews = await News.findByIdAndDelete(newsId).lean<TDbNews>().session(session);
            checkTimeout(req);

            const newsLbl = dbNews ? `"${dbNews.title}"` : `(ID: ${newsId})`;
    
            if (!dbNews) {
                throw createAppError(404, `Новость ${newsLbl} не найдена`);
            }

            return { newsLbl };
        });

        safeSendResponse(res, 200, { message: `Новость ${newsLbl} успешно удалена` });
    } catch (err) {
        next(err);
    }
};
