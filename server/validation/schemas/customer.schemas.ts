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
const bodyBaseSchema: IValidationInputSchema<TCustomerEntity>['body'] = {
    
} as const;

export const customerListSchema: IValidationInputSchema<TCustomerEntity> = {
    entityType: customerEntity,
    query: buildQueryValidationSchema(customersFilterOptions)
} as const;
