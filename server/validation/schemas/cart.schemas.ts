import type { IValidationSchema, IValidationInputSchema } from '@server/types/index.js';

const paramsBaseSchema: IValidationInputSchema['params'] = {
    productId: { type: 'objectIdString' }
} as const;

const guestCartSchema: IValidationSchema = {
    type: 'array',
    items: {
        type: 'object',
        fields: {
            id: { type: 'objectIdString' },
            quantity: { type: 'integer', min: 1 }
        }
    }
} as const;

//////////////////////////////////////////////////////////

export const guestCartItemListSchema: IValidationInputSchema = {
    body: {
        guestCart: guestCartSchema
    }
} as const;

export const cartItemUpdateSchema: IValidationInputSchema = {
    params: paramsBaseSchema,
    body: {
        quantity: { type: 'integer', min: 0 }
    }
} as const;

export const cartItemRestoreSchema: IValidationInputSchema = {
    params: paramsBaseSchema,
    body: {
        quantity: { type: 'integer', min: 0 },
        position: { type: 'integer', min: 0 }
    }
} as const;

export const cartItemRemoveSchema: IValidationInputSchema = {
    params: paramsBaseSchema
} as const;
