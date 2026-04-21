import type { IValidationInputSchema } from '@server/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TPromoEntity = typeof promoEntity;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const promoEntity = 'promotion';
const paramsBaseSchema: IValidationInputSchema<TPromoEntity>['params'] = {
    promoId: 'objectId'
} as const;
const bodyBaseSchema: IValidationInputSchema<TPromoEntity>['body'] = {
    image: { type: 'file', optional: true, formField: true },
    title: { type: 'string', match: true, formField: true },
    description: { type: 'string', match: true, formField: true },
    startDate: { type: 'date', match: true, formField: true },
    endDate: { type: 'date', match: true, formField: true }
} as const;

export const promoListSchema: IValidationInputSchema<TPromoEntity> = {
    entityType: promoEntity,
    query: {
        timestamp: { type: 'integer', optional: true },
        timeZoneOffset: { type: 'integer', optional: true }
    }
} as const;

export const promoSchema: IValidationInputSchema<TPromoEntity> = {
    entityType: promoEntity,
    params: paramsBaseSchema
} as const;

export const promoCreateSchema: IValidationInputSchema<TPromoEntity> = {
    entityType: promoEntity,
    body: bodyBaseSchema
} as const;

export const promoUpdateSchema: IValidationInputSchema<TPromoEntity> = {
    entityType: promoEntity,
    params: paramsBaseSchema,
    body: {
        ...bodyBaseSchema,
        removeImage: { type: 'boolean', optional: true }
    }
} as const;

export const promoDeleteSchema: IValidationInputSchema<TPromoEntity> = {
    entityType: promoEntity,
    params: paramsBaseSchema
} as const;
