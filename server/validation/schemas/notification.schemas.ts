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
    
} as const;

export const notificationListSchema: IValidationInputSchema<TNotificationEntity> = {
    entityType: notificationEntity,
    
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
    body: {
        ...bodyBaseSchema,
        
    }
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
