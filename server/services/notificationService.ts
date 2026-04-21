import { getPopulatedDbField } from '@server/utils/dbUtils.js';
import type {
    TDbNotificationBase,
    TDbNotificationManaged,
    TDbNotificationCustomer
} from '@server/types/index.js';
import type { INotification } from '@shared/types/index.js';

export const prepareNotification = (
    dbNotification: TDbNotificationManaged | TDbNotificationCustomer,
    { managed = false, edit = false }: { managed?: boolean; edit?: boolean } = {}
): INotification => {
    const baseData = dbNotification as TDbNotificationBase;

    const baseFields: INotification = {
        id: baseData._id.toString(),
        subject: baseData.subject,
        message: baseData.message,
        signature: baseData.signature,
        sentAt: baseData.sentAt?.toISOString() || null
    };

    if (managed) {
        const managedData = dbNotification as TDbNotificationManaged;
        
        return {
            ...baseFields,
            status: managedData.status,
            recipients: managedData.recipients.map(r =>
                edit ? r._id.toString() : getPopulatedDbField(r, 'name')
            ),
            createdBy: getPopulatedDbField(managedData.createdBy, 'name'),
            createdAt: managedData.createdAt.toISOString(),
            updateHistory: managedData.updateHistory.map(({ updatedBy, updatedAt }) => ({
                updatedBy: getPopulatedDbField(updatedBy, 'name'),
                updatedAt: updatedAt.toISOString()
            })),
            updatedAt: managedData.updatedAt.toISOString(),
            sentBy: managedData.sentBy ? getPopulatedDbField(managedData.sentBy, 'name') : undefined
        };
    }

    const customerData = dbNotification as TDbNotificationCustomer;

    return {
        ...baseFields,
        isRead: customerData.isRead ?? false,
        readAt: customerData.readAt?.toISOString() || null
    };
};
