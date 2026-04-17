import type { IValidationInputSchema } from '@server/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TNewsEntity = typeof newsEntity;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const newsEntity = 'news';
const newsParamsSchema: IValidationInputSchema<TNewsEntity>['params'] = {
    newsId: 'objectId'
} as const;
const newsBodySchema: IValidationInputSchema<TNewsEntity>['body'] = {
    title: { type: 'string', formField: true },
    content: { type: 'string', formField: true }
} as const;

export const newsSchema: IValidationInputSchema<TNewsEntity> = {
    entityType: newsEntity,
    params: newsParamsSchema
} as const;

export const newsCreateSchema: IValidationInputSchema<TNewsEntity> = {
    entityType: newsEntity,
    body: newsBodySchema
} as const;

export const newsUpdateSchema: IValidationInputSchema<TNewsEntity> = {
    entityType: newsEntity,
    params: newsParamsSchema,
    body: newsBodySchema
} as const;

export const newsDeleteSchema: IValidationInputSchema<TNewsEntity> = {
    entityType: newsEntity,
    params: newsParamsSchema
} as const;
