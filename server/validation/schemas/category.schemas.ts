import type { IValidationInputSchema } from '@server/types/index.js';

const categoryEntity = 'category';

const paramsBaseSchema: IValidationInputSchema['params'] = {
    categoryId: { type: 'objectIdString' }
} as const;

const bodyBaseSchema: IValidationInputSchema['body'] = {
    name: { type: 'string', match: true, formField: true },
    slug: { type: 'string', match: true, formField: true },
    order: { type: 'integer', min: 0, formField: true },
    parent: { type: 'objectIdString', nullable: true, formField: true }
} as const;

//////////////////////////////////////////////////////////

export const categoryCreateSchema: IValidationInputSchema = {
    entityType: categoryEntity,
    body: bodyBaseSchema
} as const;

export const categoryUpdateSchema: IValidationInputSchema = {
    entityType: categoryEntity,
    params: paramsBaseSchema,
    body: bodyBaseSchema
} as const;

export const categoryDeleteSchema: IValidationInputSchema = {
    entityType: categoryEntity,
    params: paramsBaseSchema
} as const;
