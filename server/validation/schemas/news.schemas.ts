import type { IValidationInputSchema } from '@server/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TNewsEntity = typeof newsEntity;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const newsEntity = 'news';
const paramsBaseSchema: IValidationInputSchema<TNewsEntity>['params'] = {
    newsId: 'objectId'
} as const;
const bodyBaseSchema: IValidationInputSchema<TNewsEntity>['body'] = {
    title: { type: 'string', formField: true },
    content: { type: 'string', formField: true }
} as const;

export const newsSchema: IValidationInputSchema<TNewsEntity> = {
    entityType: newsEntity,
    params: paramsBaseSchema
} as const;

export const newsCreateSchema: IValidationInputSchema<TNewsEntity> = {
    entityType: newsEntity,
    body: bodyBaseSchema
} as const;

export const newsUpdateSchema: IValidationInputSchema<TNewsEntity> = {
    entityType: newsEntity,
    params: paramsBaseSchema,
    body: bodyBaseSchema
} as const;

export const newsDeleteSchema: IValidationInputSchema<TNewsEntity> = {
    entityType: newsEntity,
    params: paramsBaseSchema
} as const;
