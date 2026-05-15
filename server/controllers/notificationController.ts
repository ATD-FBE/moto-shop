import { Types } from 'mongoose';
import Notification from '@server/db/models/Notification.js';
import User from '@server/db/models/User.js';
import { BASE_DB_NOTIFICATION_FIELDS, MANAGED_DB_NOTIFICATION_FIELDS } from '@server/config/constants.js';
import { checkTimeout } from '@server/middlewares/timeoutMiddleware.js';
import { prepareNotification } from '@server/services/notificationService.js';
import * as sseNotifications from '@server/services/sse/sseNotificationsService.js';
import { parseSortParam } from '@server/utils/aggregationUtils.js';
import { isArrayContentDifferent } from '@server/utils/compareUtils.js';
import { requireDbUser } from '@server/utils/typeGuards.js';
import { runInDbTransaction } from '@server/utils/dbUtils.js';
import { createAppError } from '@server/utils/errorUtils.js';
import safeSendResponse from '@server/utils/safeSendResponse.js';
import { notificationsSortOptions } from '@shared/sortOptions.js';
import { notificationsPageLimitOptions } from '@shared/pageLimitOptions.js';
import { USER_ROLE, NOTIFICATION_STATUS, REQUEST_STATUS } from '@shared/constants.js';
import type { RequestHandler } from 'express';
import type { ParamsDictionary } from 'express-serve-static-core';
import type { FilterQuery } from 'mongoose';
import type {
    TDbNotification,
    TDbNotificationBase,
    TDbNotificationManaged,
    INotificationCustomerMetadata
} from '@server/types/index.js';
import type {
    INotification,
    INotificationBody,
    TNotificationListQuery,
    TNotificationListResponse,
    TNotificationResponse,
    TNotificationCreateResponse,
    TNotificationUpdateResponse,
    TNotificationSendingResponse,
    TNotificationMarkAsReadResponse,
    TNotificationDeleteResponse
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface INotificationParams extends ParamsDictionary {
    notificationId: string;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

/// Загрузка списка уведомлений для одной страницы (управление админом или просмотр клиентом) ///
export const handleNotificationListRequest: RequestHandler<
    {},
    TNotificationListResponse,
    {},
    TNotificationListQuery
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;
    
    const dbUser = req.dbUser;

    const page = Math.max(req.query.page ?? 1, 1);
    const limit = Math.max(req.query.limit ?? notificationsPageLimitOptions[0], 1);
    const skip = (page - 1) * limit;

    try {
        let notificationsCount: number = 0;
        let paginatedNotificationList: INotification[] = [];

        switch (dbUser.role) {
            case USER_ROLE.ADMIN: {
                // Подсчёт документов
                const draftsFilter: FilterQuery<TDbNotificationManaged> = {
                    status: NOTIFICATION_STATUS.DRAFT
                };
                const nonDraftsFilter: FilterQuery<TDbNotificationManaged> = {
                    status: { $ne: NOTIFICATION_STATUS.DRAFT }
                };
                const [draftsCount, nonDraftsCount] = await Promise.all([
                    Notification.countDocuments(draftsFilter),
                    Notification.countDocuments(nonDraftsFilter)
                ]);
                checkTimeout(req);

                notificationsCount = draftsCount + nonDraftsCount;

                // Поиск документов
                let dbDraftNotifications: TDbNotificationManaged[] = [];
                let dbNonDraftNotifications: TDbNotificationManaged[] = [];

                if (skip < draftsCount) { // Если на странице попадают черновики
                    const draftsLimit = Math.min(limit, draftsCount - skip);

                    dbDraftNotifications = await Notification.find(draftsFilter)
                        .sort({ updatedAt: -1 })
                        .skip(skip)
                        .limit(draftsLimit)
                        .select(MANAGED_DB_NOTIFICATION_FIELDS)
                        .populate('recipients', 'name')
                        .populate('createdBy', 'name')
                        .populate('updateHistory.updatedBy', 'name')
                        .populate('sentBy', 'name')
                        .lean<TDbNotificationManaged[]>();
                    checkTimeout(req);

                    const remaining = limit - dbDraftNotifications.length;

                    if (remaining > 0) {
                        dbNonDraftNotifications = await Notification.find(nonDraftsFilter)
                            .sort({ sentAt: -1 })
                            .skip(0) // Нечерновики идут сразу после всех черновиков
                            .limit(remaining)
                            .select(MANAGED_DB_NOTIFICATION_FIELDS)
                            .populate('recipients', 'name')
                            .populate('createdBy', 'name')
                            .populate('updateHistory.updatedBy', 'name')
                            .populate('sentBy', 'name')
                            .lean<TDbNotificationManaged[]>();
                        checkTimeout(req);
                    }
                } else { // Если все черновики уже пропущены — только нечерновики
                    const nonDraftsSkip = skip - draftsCount;

                    dbNonDraftNotifications = await Notification.find(nonDraftsFilter)
                        .sort({ sentAt: -1 })
                        .skip(nonDraftsSkip)
                        .limit(limit)
                        .select(MANAGED_DB_NOTIFICATION_FIELDS)
                        .populate('recipients', 'name')
                        .populate('createdBy', 'name')
                        .populate('updateHistory.updatedBy', 'name')
                        .populate('sentBy', 'name')
                        .lean<TDbNotificationManaged[]>();
                    checkTimeout(req);
                }

                const dbPaginatedNotificationList = [...dbDraftNotifications, ...dbNonDraftNotifications];

                // Подготовка данных
                paginatedNotificationList = dbPaginatedNotificationList.map(notif =>
                    prepareNotification(notif, { managed: true })
                );

                break;
            }

            case USER_ROLE.CUSTOMER: {
                // Подсчёт документов
                const notifications = dbUser.notifications;
                const notificationIds = notifications.map(n => n.notificationId);

                notificationsCount = await Notification.countDocuments({ _id: { $in: notificationIds } });
                checkTimeout(req);

                // Поиск документов
                const { sortField, sortOrder } = parseSortParam<TDbNotificationBase>(
                    req.query.sort,
                    notificationsSortOptions
                );

                const dbPaginatedNotificationList = await Notification
                    .find({ _id: { $in: notificationIds } })
                    .sort({ [sortField]: sortOrder })
                    .skip(skip)
                    .limit(limit)
                    .select(BASE_DB_NOTIFICATION_FIELDS)
                    .lean<TDbNotificationBase[]>();
                checkTimeout(req);

                // Подготовка данных
                const notificationMap = notifications.reduce((acc, { notificationId, isRead, readAt }) => {
                    acc[notificationId.toString()] = { isRead, readAt: readAt ?? null };
                    return acc;
                }, {} as Record<string, INotificationCustomerMetadata>);

                paginatedNotificationList = dbPaginatedNotificationList.map(notif => {
                    const metadata = notificationMap[notif._id.toString()];
                    const extendedNotif = {
                        ...notif,
                        isRead: metadata?.isRead ?? false,
                        readAt: metadata?.readAt ?? null
                    };

                    return prepareNotification(extendedNotif, { managed: false });
                });

                break;
            }

            default:
                return safeSendResponse(res, 403, {
                    message: 'Запрещено: несоответствующая роль',
                    reason: REQUEST_STATUS.DENIED
                });
        }

        safeSendResponse(res, 200, {
            message: 'Уведомления успешно загружены',
            notificationsCount,
            paginatedNotificationList
        });
    } catch (err) {
        next(err);
    }
};

/// Загрузка черновика уведомления для редактирования ///
export const handleNotificationRequest: RequestHandler<
    INotificationParams,
    TNotificationResponse
> = async (req, res, next) => {
    const notificationId = req.params.notificationId;

    try {
        const dbNotification = await Notification.findById(notificationId)
            .select(MANAGED_DB_NOTIFICATION_FIELDS)
            .lean<TDbNotificationManaged>();
        checkTimeout(req);

        if (!dbNotification) {
            return safeSendResponse(res, 404, {
                message: `Уведомление (ID: ${notificationId}) не найдено`
            });
        }

        safeSendResponse(res, 200, {
            message: `Уведомление "${dbNotification.subject}" успешно загружено`,
            notification: prepareNotification(dbNotification, { managed: true, edit: true })
        });
    } catch (err) {
        next(err);
    }
};

/// Создание черновика уведомления ///
export const handleNotificationCreateRequest: RequestHandler<
    {},
    TNotificationCreateResponse,
    INotificationBody
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const userId = req.dbUser._id;
    const { recipients, subject, message, signature } = req.body;

    try {
        const newNotification = await Notification.create({
            recipients, // Mongoose сам превратит строки массива в ObjectId
            subject: subject.trim(),
            message: message.trim(),
            signature: signature.trim(),
            createdBy: userId
        });
        checkTimeout(req);

        safeSendResponse(res, 201, {
            message: `Уведомление "${newNotification.subject}" успешно создано`
        });
    } catch (err) {
        next(err);
    }
};

/// Изменение черновика уведомления ///
export const handleNotificationUpdateRequest: RequestHandler<
    INotificationParams,
    TNotificationUpdateResponse,
    INotificationBody
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const userId = req.dbUser._id;
    const notificationId = req.params.notificationId;
    const { recipients, subject, message, signature } = req.body;

    try {
        const { notifLbl } = await runInDbTransaction(async (session) => {
            // Проверка существования и доступности изменяемого уведомления
            const dbNotification = await Notification.findById(notificationId).session(session);
            checkTimeout(req);

            const notifLbl = dbNotification ? `"${dbNotification.subject}"` : `(ID: ${notificationId})`;

            if (!dbNotification) {
                throw createAppError(404, `Уведомление ${notifLbl} не найдено`);
            }
            if (dbNotification.status !== NOTIFICATION_STATUS.DRAFT) {
                throw createAppError(
                    400,
                    `Уведомление ${notifLbl} уже отправлено, редактирование невозможно`
                );
            }

            // Установка новых данных и проверка их изменений
            const currentRecipients = dbNotification.recipients.map(id => id.toString());
            const preparedRecipients = [...new Set(recipients)];
            const isRecipientsChanged = isArrayContentDifferent(currentRecipients, preparedRecipients);
            
            if (isRecipientsChanged) {
                dbNotification.recipients = preparedRecipients.map(r =>
                    Types.ObjectId.createFromHexString(r)
                );
            }

            dbNotification.set({
                subject: subject.trim(),
                message: message.trim(),
                signature: signature.trim()
            });

            if (!dbNotification.isModified()) {
                throw createAppError(204);
            }

            // Добавление лога редактирования и сохранение в базе MongoDB
            dbNotification.updateHistory.push({ updatedBy: userId, updatedAt: new Date() });
            await dbNotification.save({ session });
            checkTimeout(req);

            return { notifLbl };
        });

        safeSendResponse(res, 200, { message: `Уведомление ${notifLbl} успешно изменено` });
    } catch (err) {
        next(err);
    }
};

/// Отправка уведомления ///
export const handleNotificationSendingRequest: RequestHandler<
    INotificationParams,
    TNotificationSendingResponse
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const dbUser = req.dbUser;
    const notificationId = req.params.notificationId;

    try {
        const transactionResult = await runInDbTransaction(async (session) => {
            const dbNotification = await Notification.findById(notificationId).session(session);
            checkTimeout(req);

            const notifLbl = dbNotification ? `"${dbNotification.subject}"` : `(ID: ${notificationId})`;

            if (!dbNotification) {
                throw createAppError(404, `Уведомление ${notifLbl} не найдено`);
            }
            if (dbNotification.status !== NOTIFICATION_STATUS.DRAFT) {
                throw createAppError(
                    400,
                    `Уведомление ${notifLbl} уже отправлено, повторная отправка невозможна`
                );
            }
            if (!dbNotification.recipients?.length) {
                throw createAppError(400, `Нет получателей для уведомления ${notifLbl}`);
            }

            // Изменение записи о получении уведомления у клиентов
            const updateResult = await User.updateMany(
                { _id: { $in: dbNotification.recipients } },
                { $addToSet: { notifications: { notificationId } } },
                { session }
            );
            checkTimeout(req);

            // Отметка об отправке в уведомлении
            const now = new Date();

            dbNotification.set({
                status: NOTIFICATION_STATUS.SENT,
                sentAt: now,
                sentBy: dbUser._id
            });

            const updatedDbNotification = await dbNotification.save({ session });
            checkTimeout(req);

            return {
                recipientsSentCount: updateResult.modifiedCount,
                recipients: updatedDbNotification.recipients,
                notifLbl,
                now
            };
        });

        const { recipientsSentCount, recipients, notifLbl, now } = transactionResult;

        // Отправка SSE-сообщения клиентам-получателям
        if (recipientsSentCount > 0) {
            sseNotifications.sendToClients(recipients, { newUnreadNotificationsChange: 1 });
        }

        safeSendResponse(res, 200, {
            message: recipientsSentCount === 0
                ? `Уведомление ${notifLbl} отправлено, но ни один пользователь не был` +
                    ' обновлён - возможно, оно уже есть у получателей, либо они были удалены'
                : `Уведомление ${notifLbl} успешно отправлено`,
            notificationUpdateData: {
                status: NOTIFICATION_STATUS.SENT,
                sentAt: now.toISOString(),
                sentBy: dbUser.name
            }
        });
    } catch (err) {
        next(err);
    }
};

/// Отметка уведомления как прочитанного ///
export const handleNotificationMarkAsReadRequest: RequestHandler<
    INotificationParams,
    TNotificationMarkAsReadResponse
> = async (req, res, next) => {
    if (!requireDbUser(req, next)) return;

    const userId = req.dbUser._id;
    const notificationId = req.params.notificationId;

    try {
        const { notifLbl, now } = await runInDbTransaction(async (session) => {
            const dbUserInTransaction = await User.findById(userId).session(session);

            if (!dbUserInTransaction) {
                throw createAppError(404, `Пользователь (ID: ${userId}) не найден`);
            }

            const userNotification = dbUserInTransaction.notifications.find(
                n => n.notificationId.toString() === notificationId
            );
        
            if (!userNotification) {
                throw createAppError(404, `Уведомление (ID: ${notificationId}) не найдено у пользователя`);
            }
            if (userNotification.isRead) {
                throw createAppError(204);
            }

            const dbNotification = await Notification.findById(notificationId)
                .lean<TDbNotification>()
                .session(session);
            checkTimeout(req);

            const notifLbl = dbNotification ? `"${dbNotification.subject}"` : `(ID: ${notificationId})`;
        
            if (!dbNotification) {
                throw createAppError(404, `Уведомление ${notifLbl} не найдено`);
            }

            const now = new Date();
            
            userNotification.isRead = true;
            userNotification.readAt = now;
        
            await dbUserInTransaction.save({ session });
            checkTimeout(req);

            return { notifLbl, now };
        });

        // Отправка SSE-сообщения клиенту
        sseNotifications.sendToClients([userId], { newUnreadNotificationsChange: -1 });

        safeSendResponse(res, 200, {
            message: `Уведомление ${notifLbl} отмечено как прочитанное`,
            notificationUpdateData: {
                isRead: true,
                readAt: now.toISOString()
            }
        });
    } catch (err) {
        next(err);
    }
};

/// Удаление черновика уведомления ///
export const handleNotificationDeleteRequest: RequestHandler<
    INotificationParams,
    TNotificationDeleteResponse
> = async (req, res, next) => {
    const notificationId = req.params.notificationId;

    try {
        const { notifLbl } = await runInDbTransaction(async (session) => {
            const dbNotification = await Notification.findById(notificationId).session(session);
            checkTimeout(req);

            const notifLbl = dbNotification ? `"${dbNotification.subject}"` : `(ID: ${notificationId})`;
    
            if (!dbNotification) {
                throw createAppError(404, `Уведомление ${notifLbl} не найдено`);
            }
            if (dbNotification.status !== NOTIFICATION_STATUS.DRAFT) {
                throw createAppError(400, `Уведомление ${notifLbl} уже отправлено, удаление невозможно`);
            }
    
            await dbNotification.deleteOne({ session });
            checkTimeout(req);

            return { notifLbl };
        });

        safeSendResponse(res, 200, { message: `Уведомление ${notifLbl} успешно удалено` });
    } catch (err) {
        next(err);
    }
};
