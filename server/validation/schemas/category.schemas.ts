import type { IValidationInputSchema } from '@server/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TCategoryEntity = typeof categoryEntity;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const categoryEntity = 'category';
const paramsBaseSchema: IValidationInputSchema<TCategoryEntity>['params'] = {
    categoryId: 'objectIdString'
} as const;
const bodyBaseSchema: IValidationInputSchema<TCategoryEntity>['body'] = {
    name: { type: 'string', match: true, formField: true },
    slug: { type: 'string', match: true, formField: true },
    order: { type: 'integer', min: 0, formField: true },
    parent: { type: 'objectIdString', nullable: true, formField: true }
} as const;

export const categoryCreateSchema: IValidationInputSchema<TCategoryEntity> = {
    entityType: categoryEntity,
    body: bodyBaseSchema
} as const;

export const categoryUpdateSchema: IValidationInputSchema<TCategoryEntity> = {
    entityType: categoryEntity,
    params: paramsBaseSchema,
    body: bodyBaseSchema
} as const;

export const categoryDeleteSchema: IValidationInputSchema<TCategoryEntity> = {
    entityType: categoryEntity,
    params: paramsBaseSchema
} as const;
