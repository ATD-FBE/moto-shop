import { buildQueryValidationSchema } from '@server/validation/validationEngine.js';
import { productsFilterConfig } from '@shared/filterOptions.js';
import { PRODUCT_UNITS } from '@shared/constants.js';
import type { IValidationSchema, IValidationInputSchema } from '@server/types/index.js';

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

const bodyBaseSchema: IValidationInputSchema<TProductEntity>['body'] = {
    images: { type: 'files', optional: true, formField: true },
    mainImageIndex: { type: 'integer', min: 0, optional: true },
    sku: { type: 'string', optional: true, match: true, formField: true },
    name: { type: 'string', match: true, formField: true },
    brand: { type: 'string', optional: true, match: true, formField: true },
    description: { type: 'string', optional: true, match: true, formField: true },
    stock: { type: 'integer', min: 0,  formField: true },
    unit: { type: 'string', enum: PRODUCT_UNITS, formField: true },
    price: { type: 'number', min: 0,  match: true, formField: true },
    discount: { type: 'integer', min: 0, max: 100, formField: true },
    category: { type: 'objectId', formField: true },
    tags: { type: 'string', optional: true, match: true, formField: true },
    isActive: { type: 'boolean', formField: true }
} as const;

const productIdsSchema: IValidationSchema = {
    type: 'array',
    items: { type: 'objectId' }
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

export const productCreateSchema: IValidationInputSchema<TProductEntity> = {
    entityType: productEntity,
    body: bodyBaseSchema
} as const;

export const productUpdateSchema: IValidationInputSchema<TProductEntity> = {
    entityType: productEntity,
    params: paramsBaseSchema,
    body: {
        ...bodyBaseSchema,
        imageFilenamesToDelete: { type: 'string', optional: true }
    }
} as const;

export const bulkProductUpdateSchema: IValidationInputSchema<TProductEntity> = {
    entityType: productEntity,
    body: {
        productIds: productIdsSchema,
        formFields: {
            type: 'object',
            fields: {
                brand: { type: 'string', optional: true, match: true, formField: true },
                unit: { type: 'string', optional: true, enum: PRODUCT_UNITS, formField: true },
                discount: { type: 'integer', optional: true, min: 0, max: 100, formField: true },
                category: { type: 'objectId', optional: true, formField: true },
                tags: { type: 'string', optional: true, match: true, formField: true },
                isActive: { type: 'boolean', optional: true, formField: true }
            }
        }
    }
} as const;

export const productDeleteSchema: IValidationInputSchema<TProductEntity> = {
    entityType: productEntity,
    params: paramsBaseSchema
} as const;

export const bulkProductDeleteSchema: IValidationInputSchema<TProductEntity> = {
    entityType: productEntity,
    body: {
        productIds: productIdsSchema
    }
} as const;
