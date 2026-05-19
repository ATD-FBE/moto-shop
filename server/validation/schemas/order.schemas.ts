import { buildQueryValidationSchema } from '@server/validation/validationEngine.js';
import { ordersFilterOptions } from '@shared/filterOptions.js';
import { ORDER_VIEW_MODE } from '@shared/constants.js';
import type { IValidationSchema, IValidationInputSchema } from '@server/types/index.js';

const orderEntity = 'order';

const paramsBaseSchema: IValidationInputSchema['params'] = {
    orderId: 'objectIdString'
} as const;

export const orderListSchema: IValidationInputSchema = {
    query: buildQueryValidationSchema(ordersFilterOptions)
} as const;

export const orderSchema: IValidationInputSchema = {
    params: paramsBaseSchema,
    query: {
        viewMode: { type: 'string', enum: Object.values(ORDER_VIEW_MODE) }
    }
} as const;

export const orderItemsAvailabilitySchema: IValidationInputSchema = {
    params: paramsBaseSchema
} as const;

export const orderRepeatSchema: IValidationInputSchema = {
    params: paramsBaseSchema
} as const;

export const orderInternalNoteUpdateSchema: IValidationInputSchema = {
    entityType: orderEntity,
    params: paramsBaseSchema,
    body: {
        internalNote: { type: 'string', optional: true, match: true, formField: true }
    }
} as const;
