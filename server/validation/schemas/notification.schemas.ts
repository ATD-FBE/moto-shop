import type { IValidationInputSchema } from '@server/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TNotificationEntity = typeof notificationEntity;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const notificationEntity = 'notification';
const paramsBaseSchema: IValidationInputSchema<TNotificationEntity>['params'] = {
    notificationId: 'objectId'
} as const;
const bodyBaseSchema: IValidationInputSchema<TNotificationEntity>['body'] = {
    recipients: {
        type: 'array',
        items: { type: 'objectId' },
        match: true,
        formField: true
    },
    subject: { type: 'string', match: true, formField: true },
    message: { type: 'string', match: true, formField: true },
    signature: { type: 'string', match: true, formField: true }
} as const;

export const notificationListSchema: IValidationInputSchema<TNotificationEntity> = {
    entityType: notificationEntity,
    query: {
        page: { type: 'integer', optional: true },
        limit: { type: 'integer', optional: true },
        sort: { type: 'string', optional: true }
    }
} as const;

export const notificationSchema: IValidationInputSchema<TNotificationEntity> = {
    entityType: notificationEntity,
    params: paramsBaseSchema
} as const;

export const notificationCreateSchema: IValidationInputSchema<TNotificationEntity> = {
    entityType: notificationEntity,
    body: bodyBaseSchema
} as const;

export const notificationUpdateSchema: IValidationInputSchema<TNotificationEntity> = {
    entityType: notificationEntity,
    params: paramsBaseSchema,
    body: bodyBaseSchema
} as const;

export const notificationSendingSchema: IValidationInputSchema<TNotificationEntity> = {
    entityType: notificationEntity,
    params: paramsBaseSchema
} as const;

export const notificationMarkAsReadSchema: IValidationInputSchema<TNotificationEntity> = {
    entityType: notificationEntity,
    params: paramsBaseSchema
} as const;

export const notificationDeleteSchema: IValidationInputSchema<TNotificationEntity> = {
    entityType: notificationEntity,
    params: paramsBaseSchema
} as const;
