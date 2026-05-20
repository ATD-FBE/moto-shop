import { DISCOUNT_SOURCE, DELIVERY_METHOD, PAYMENT_METHOD } from '@shared/constants.js';
import { currencyValidation } from '@shared/fieldRules.js';
import type { IValidationInputSchema } from '@server/types/index.js';

const checkoutEntity = 'checkout';
const paramsBaseSchema: IValidationInputSchema['params'] = {
    orderId: 'objectIdString'
} as const;

export const orderDraftSyncSchema: IValidationInputSchema = {
    params: paramsBaseSchema
} as const;

export const orderDraftCreateSchema: IValidationInputSchema = {
    body: {
        initialOrderItemSnapshots: {
            type: 'array',
            items: {
                type: 'object',
                fields: {
                    productId: { type: 'objectIdString' },
                    priceSnapshot: { type: 'float', min: 0, match: currencyValidation },
                    appliedDiscountSnapshot: { type: 'float', min: 0, max: 100 },
                    appliedDiscountSourceSnapshot: { type: 'string', enum: Object.values(DISCOUNT_SOURCE) }
                }
            }
        }
    }
} as const;

export const orderDraftUpdateSchema: IValidationInputSchema = {
    entityType: checkoutEntity,
    params: paramsBaseSchema,
    body: {
        firstName: { type: 'string', optional: true, emptyable: true, match: true, formField: true },
        lastName: { type: 'string', optional: true, emptyable: true, match: true, formField: true },
        middleName: { type: 'string', optional: true, emptyable: true, match: true, formField: true },
        email: { type: 'string', optional: true, emptyable: true, match: true, formField: true },
        phone: { type: 'string', optional: true, emptyable: true, match: true, formField: true },
        deliveryMethod: {
            type: 'string',
            optional: true,
            emptyable: true,
            enum: Object.values(DELIVERY_METHOD),
            formField: true
        },
        allowCourierExtra: { type: 'boolean', optional: true, formField: true },
        region: { type: 'string', optional: true, emptyable: true, match: true, formField: true },
        district: { type: 'string', optional: true, emptyable: true, match: true, formField: true },
        city: { type: 'string', optional: true, emptyable: true, match: true, formField: true },
        street: { type: 'string', optional: true, emptyable: true, match: true, formField: true },
        house: { type: 'string', optional: true, emptyable: true, match: true, formField: true },
        apartment: { type: 'string', optional: true, emptyable: true, match: true, formField: true },
        postalCode: { type: 'string', optional: true, emptyable: true, match: true, formField: true },
        defaultPaymentMethod: {
            type: 'string',
            optional: true,
            emptyable: true,
            enum: Object.values(PAYMENT_METHOD),
            formField: true
        },
        customerComment: { type: 'string', optional: true, emptyable: true, formField: true }
    }
} as const;

export const orderDraftConfirmSchema: IValidationInputSchema = {
    entityType: checkoutEntity,
    params: paramsBaseSchema,
    body: {
        firstName: { type: 'string', match: true, formField: true },
        lastName: { type: 'string', match: true, formField: true },
        middleName: { type: 'string', optional: true, match: true, formField: true },
        email: { type: 'string', match: true, formField: true },
        phone: { type: 'string', match: true, formField: true },
        deliveryMethod: { type: 'string', enum: Object.values(DELIVERY_METHOD), formField: true },
        allowCourierExtra: { type: 'boolean', optional: true, formField: true },
        region: { type: 'string', optional: true, match: true, formField: true },
        district: { type: 'string', optional: true, match: true, formField: true },
        city: { type: 'string', optional: true, match: true, formField: true },
        street: { type: 'string', optional: true, match: true, formField: true },
        house: { type: 'string', optional: true, match: true, formField: true },
        apartment: { type: 'string', optional: true, match: true, formField: true },
        postalCode: { type: 'string', optional: true, match: true, formField: true },
        defaultPaymentMethod: { type: 'string', enum: Object.values(PAYMENT_METHOD), formField: true },
        customerComment: { type: 'string', optional: true, formField: true }
    }
} as const;

export const orderDraftDeleteSchema: IValidationInputSchema = {
    params: paramsBaseSchema
} as const;
