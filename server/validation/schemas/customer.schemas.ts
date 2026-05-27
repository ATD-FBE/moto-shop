import { buildQueryValidationSchema } from '@server/validation/validationEngine.js';
import { customersFilterOptions } from '@shared/filterOptions.js';
import type { IValidationInputSchema } from '@server/types/index.js';

const customerEntity = 'customer';

const paramsBaseSchema: IValidationInputSchema['params'] = {
    customerId: { type: 'objectIdString' }
} as const;

//////////////////////////////////////////////////////////

export const customerListSchema: IValidationInputSchema = {
    entityType: customerEntity,
    query: buildQueryValidationSchema(customersFilterOptions)
} as const;

export const customerOrderListSchema: IValidationInputSchema = {
    entityType: customerEntity,
    params: paramsBaseSchema,
    query: {
        firstOrderId: { type: 'objectIdString', optional: true },
        skip: { type: 'integer', optional: true },
        limit: { type: 'integer', optional: true }
    }
} as const;

export const customerDiscountUpdateSchema: IValidationInputSchema = {
    entityType: customerEntity,
    params: paramsBaseSchema,
    body: {
        discount: { type: 'integer', min: 0, max: 100, formField: true }
    }
} as const;

export const customerBanStatusUpdateSchema: IValidationInputSchema = {
    entityType: customerEntity,
    params: paramsBaseSchema,
    body: {
        newBanStatus: { type: 'boolean' }
    }
} as const;
