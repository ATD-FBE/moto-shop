import type { IValidationInputSchema } from '@server/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TNewsEntity = typeof newsEntity;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const newsEntity = 'news';
const newsParams: IValidationInputSchema<TNewsEntity>['params'] = {
    newsId: 'objectId'
};
const newsBody: IValidationInputSchema<TNewsEntity>['body'] = {
    title: { type: 'string', formField: true },
    content: { type: 'string', formField: true }
};

export const newsSchema: IValidationInputSchema<TNewsEntity> = {
    entityType: newsEntity,
    params: newsParams
};

export const newsCreateSchema: IValidationInputSchema<TNewsEntity> = {
    entityType: newsEntity,
    body: newsBody
};

export const newsUpdateSchema: IValidationInputSchema<TNewsEntity> = {
    entityType: newsEntity,
    params: newsParams,
    body: newsBody
};

export const newsDeleteSchema: IValidationInputSchema<TNewsEntity> = {
    entityType: newsEntity,
    params: newsParams
};
