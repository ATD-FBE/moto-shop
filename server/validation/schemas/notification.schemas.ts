import { buildQueryValidationSchema } from '@server/validation/validationEngine.js';
import type { IValidationInputSchema } from '@server/types/index.js';

const notificationEntity = 'notification';

const paramsBaseSchema: IValidationInputSchema['params'] = {
    notificationId: { type: 'objectIdString' }
} as const;

const bodyBaseSchema: IValidationInputSchema['body'] = {
    recipients: {
        type: 'array',
        items: { type: 'objectIdString' },
        match: true,
        formField: true
    },
    subject: { type: 'string', match: true, formField: true },
    message: { type: 'string', match: true, formField: true },
    signature: { type: 'string', match: true, formField: true }
} as const;

//////////////////////////////////////////////////////////

export const notificationListSchema: IValidationInputSchema = {
    entityType: notificationEntity,
    query: buildQueryValidationSchema()
} as const;

export const notificationSchema: IValidationInputSchema = {
    entityType: notificationEntity,
    params: paramsBaseSchema
} as const;

export const notificationCreateSchema: IValidationInputSchema = {
    entityType: notificationEntity,
    body: bodyBaseSchema
} as const;

export const notificationUpdateSchema: IValidationInputSchema = {
    entityType: notificationEntity,
    params: paramsBaseSchema,
    body: bodyBaseSchema
} as const;

export const notificationSendingSchema: IValidationInputSchema = {
    entityType: notificationEntity,
    params: paramsBaseSchema
} as const;

export const notificationMarkAsReadSchema: IValidationInputSchema = {
    entityType: notificationEntity,
    params: paramsBaseSchema
} as const;

export const notificationDeleteSchema: IValidationInputSchema = {
    entityType: notificationEntity,
    params: paramsBaseSchema
} as const;
