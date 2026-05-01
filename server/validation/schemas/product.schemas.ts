import { buildQueryValidationSchema } from '@server/validation/validationEngine.js';
import { productsFilterConfig } from '@shared/filterOptions.js';
import type { IValidationInputSchema } from '@server/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TProductEntity = typeof productEntity;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const productEntity = 'product';
const paramsBaseSchema: IValidationInputSchema<TProductEntity>['params'] = {
    productId: 'objectId'
} as const;

export const productListSchema: IValidationInputSchema<TProductEntity> = {
    entityType: productEntity,
    query: {
        ...buildQueryValidationSchema(productsFilterConfig),
        pageContext: { type: 'string', optional: true },
        category: { type: 'string', optional: true }
    }
} as const;

export const productSchema: IValidationInputSchema<TProductEntity> = {
    entityType: productEntity,
    params: paramsBaseSchema
} as const;
