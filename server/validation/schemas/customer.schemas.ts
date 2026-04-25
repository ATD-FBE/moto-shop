import { buildQueryValidationSchema } from '@server/validation/validationEngine.js';
import { customersFilterOptions } from '@shared/filterOptions.js';
import type { IValidationInputSchema } from '@server/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TCustomerEntity = typeof customerEntity;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const customerEntity = 'customer';
const paramsBaseSchema: IValidationInputSchema<TCustomerEntity>['params'] = {
    customerId: 'objectId'
} as const;

export const customerListSchema: IValidationInputSchema<TCustomerEntity> = {
    entityType: customerEntity,
    query: buildQueryValidationSchema(customersFilterOptions)
} as const;

export const customerOrderListSchema: IValidationInputSchema<TCustomerEntity> = {
    entityType: customerEntity,
    params: paramsBaseSchema,
    query: {
        firstOrderId: { type: 'objectId', optional: true },
        skip: { type: 'integer', optional: true },
        limit: { type: 'integer', optional: true }
    }
} as const;

export const customerDiscountUpdateSchema: IValidationInputSchema<TCustomerEntity> = {
    entityType: customerEntity,
    params: paramsBaseSchema,
    body: {
        discount: { type: 'integer', min: 0, max: 100, formField: true }
    }
} as const;

export const customerBanStatusUpdateSchema: IValidationInputSchema<TCustomerEntity> = {
    entityType: customerEntity,
    params: paramsBaseSchema,
    body: {
        newBanStatus: { type: 'boolean' }
    }
} as const;
