import { getPopulatedDbField } from '@server/utils/dbUtils.js';
import type { TDbNotificationExtended } from '@server/types/index.js';
import type { INotification } from '@shared/types/index.js';

export const prepareNotification = (
    dbNotification: TDbNotificationExtended,
    { managed = false, edit = false }: { managed?: boolean, edit?: boolean } = {}
): INotification => ({
    id: dbNotification._id.toString(),
    subject: dbNotification.subject,
    message: dbNotification.message,
    signature: dbNotification.signature,
    sentAt: dbNotification.sentAt?.toISOString() || null,
    ...(managed ? {
        status: dbNotification.status,
        recipients: dbNotification.recipients.map(r =>
            edit ? r._id.toString() : getPopulatedDbField(r, 'name')
        ),
        createdBy: getPopulatedDbField(dbNotification.createdBy, 'name'),
        createdAt: dbNotification.createdAt.toISOString(),
        updateHistory: dbNotification.updateHistory.map(({ updatedBy, updatedAt }) => ({
            updatedBy: getPopulatedDbField(updatedBy, 'name'),
            updatedAt: updatedAt.toISOString()
        })),
        updatedAt: dbNotification.updatedAt.toISOString(),
        sentBy: dbNotification.sentBy ? getPopulatedDbField(dbNotification.sentBy, 'name') : undefined
    } : {
        isRead: dbNotification.isRead ?? false,
        readAt: dbNotification.readAt?.toISOString() || null
    })
});
