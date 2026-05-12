import { buildQueryValidationSchema } from '@server/validation/validationEngine.js';
import type { IValidationInputSchema } from '@server/types/index.js';

const promoEntity = 'promotion';
const paramsBaseSchema: IValidationInputSchema['params'] = {
    promoId: 'objectIdString'
} as const;
const bodyBaseSchema: IValidationInputSchema['body'] = {
    image: { type: 'file', optional: true, formField: true },
    title: { type: 'string', match: true, formField: true },
    description: { type: 'string', match: true, formField: true },
    startDate: { type: 'date', match: true, formField: true },
    endDate: { type: 'date', match: true, formField: true }
} as const;

export const promoListSchema: IValidationInputSchema = {
    entityType: promoEntity,
    query: buildQueryValidationSchema()
} as const;

export const promoSchema: IValidationInputSchema = {
    entityType: promoEntity,
    params: paramsBaseSchema
} as const;

export const promoCreateSchema: IValidationInputSchema = {
    entityType: promoEntity,
    body: bodyBaseSchema
} as const;

export const promoUpdateSchema: IValidationInputSchema = {
    entityType: promoEntity,
    params: paramsBaseSchema,
    body: {
        ...bodyBaseSchema,
        removeImage: { type: 'boolean', optional: true }
    }
} as const;

export const promoDeleteSchema: IValidationInputSchema = {
    entityType: promoEntity,
    params: paramsBaseSchema
} as const;
