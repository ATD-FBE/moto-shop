import type { IValidationInputSchema } from '@server/types/index.js';

const newsEntity = 'news';

const paramsBaseSchema: IValidationInputSchema['params'] = {
    newsId: { type: 'objectIdString' }
} as const;

const bodyBaseSchema: IValidationInputSchema['body'] = {
    title: { type: 'string', match: true, formField: true },
    content: { type: 'string', match: true, formField: true }
} as const;

//////////////////////////////////////////////////////////

export const newsSchema: IValidationInputSchema = {
    entityType: newsEntity,
    params: paramsBaseSchema
} as const;

export const newsCreateSchema: IValidationInputSchema = {
    entityType: newsEntity,
    body: bodyBaseSchema
} as const;

export const newsUpdateSchema: IValidationInputSchema = {
    entityType: newsEntity,
    params: paramsBaseSchema,
    body: bodyBaseSchema
} as const;

export const newsDeleteSchema: IValidationInputSchema = {
    entityType: newsEntity,
    params: paramsBaseSchema
} as const;
