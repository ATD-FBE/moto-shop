import { buildQueryValidationSchema } from '@server/validation/validationEngine.js';
import { ordersFilterOptions } from '@shared/filterOptions.js';
import { makeOrderItemQuantityFieldName } from '@shared/commonHelpers.js';
import { ORDER_VIEW_MODE, DELIVERY_METHOD, PAYMENT_METHOD, ORDER_ACTION } from '@shared/constants.js';
import type { IDynamicErrorConfig, IValidationInputSchema } from '@server/types/index.js';

const orderEntity = 'order';

const paramsBaseSchema: IValidationInputSchema['params'] = {
    orderId: 'objectIdString'
} as const;

const orderItemsUpdateDynamicErrorSchema: IDynamicErrorConfig<typeof orderEntity> = {
    idField: 'productId',
    entityField: 'itemQuantity',
    generateFieldName: makeOrderItemQuantityFieldName
} as const;

export const orderListSchema: IValidationInputSchema = {
    query: buildQueryValidationSchema(ordersFilterOptions)
} as const;

export const orderSchema: IValidationInputSchema = {
    params: paramsBaseSchema,
    query: {
        viewMode: { type: 'string', enum: Object.values(ORDER_VIEW_MODE) }
    }
} as const;

export const orderItemsAvailabilitySchema: IValidationInputSchema = {
    params: paramsBaseSchema
} as const;

export const orderRepeatSchema: IValidationInputSchema = {
    params: paramsBaseSchema
} as const;

export const orderInternalNoteUpdateSchema: IValidationInputSchema = {
    entityType: orderEntity,
    params: paramsBaseSchema,
    body: {
        internalNote: { type: 'string', optional: true, match: true, formField: true }
    }
} as const;

export const orderDetailsUpdateSchema: IValidationInputSchema = {
    entityType: orderEntity,
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
        customerComment: { type: 'string', optional: true, emptyable: true, formField: true },
        editReason: { type: 'string', match: true, formField: true }
    }
} as const;

export const orderItemsUpdateSchema: IValidationInputSchema = {
    entityType: orderEntity,
    params: paramsBaseSchema,
    body: {
        items: {
            type: 'array',
            items: {
                type: 'object',
                fields: {
                    productId: {
                        type: 'objectIdString',
                        formField: true,
                        dynamicErrorConfig: orderItemsUpdateDynamicErrorSchema
                    },
                    quantity: {
                        type: 'integer',
                        min: 0,
                        formField: true,
                        dynamicErrorConfig: orderItemsUpdateDynamicErrorSchema
                    }
                }
            }
        },
        editReason: { type: 'string', match: true, formField: true }
    }
} as const;

export const orderStatusUpdateSchema: IValidationInputSchema = {
    entityType: orderEntity,
    params: paramsBaseSchema,
    body: {
        action: { type: 'string', enum: Object.values(ORDER_ACTION) },
        formFields: {
            type: 'object',
            fields: {
                shippingCost: { type: 'float', optional: true, min: 0, match: true, formField: true },
                cancellationReason: { type: 'string', optional: true, match: true, formField: true }
            }
        }
    }
} as const;
