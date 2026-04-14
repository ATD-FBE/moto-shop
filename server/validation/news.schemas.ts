import type { IValidateInputSchema } from '@server/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TNewsEntity = typeof newsEntityType;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const newsEntityType = 'news';
const newsParams: IValidateInputSchema<TNewsEntity>['params'] = {
    newsId: 'objectId'
};
const newsBody: IValidateInputSchema<TNewsEntity>['body'] = {
    title: { type: 'string', form: true },
    content: { type: 'string', form: true }
};

export const newsSchema: IValidateInputSchema<TNewsEntity> = {
    entityType: newsEntityType,
    params: newsParams
};

export const newsCreateSchema: IValidateInputSchema<TNewsEntity> = {
    entityType: newsEntityType,
    body: newsBody
};

export const newsUpdateSchema: IValidateInputSchema<TNewsEntity> = {
    entityType: newsEntityType,
    params: newsParams,
    body: newsBody
};

export const newsDeleteSchema: IValidateInputSchema<TNewsEntity> = {
    entityType: newsEntityType,
    params: newsParams
};
