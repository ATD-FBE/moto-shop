import { buildQueryValidationSchema } from '@server/validation/validationEngine.js';
import { productsFilterOptions } from '@shared/filterOptions.js';
import { PRODUCT_UNITS } from '@shared/constants.js';
import type { IValidationSchema, IValidationInputSchema } from '@server/types/index.js';

const productEntity = 'product';

const paramsBaseSchema: IValidationInputSchema['params'] = {
    productId: 'objectIdString'
} as const;

const bodyBaseSchema: IValidationInputSchema['body'] = {
    images: { type: 'files', formField: true },
    mainImageIndex: { type: 'integer', min: 0, optional: true },
    sku: { type: 'string', optional: true, match: true, formField: true },
    name: { type: 'string', match: true, formField: true },
    brand: { type: 'string', optional: true, match: true, formField: true },
    description: { type: 'string', optional: true, match: true, formField: true },
    stock: { type: 'integer', min: 0,  formField: true },
    unit: { type: 'string', enum: PRODUCT_UNITS, formField: true },
    price: { type: 'float', min: 0,  match: true, formField: true },
    discount: { type: 'float', min: 0, max: 100, match: true, formField: true },
    category: { type: 'objectIdString', formField: true },
    tags: { type: 'string', optional: true, match: true, formField: true },
    isActive: { type: 'boolean', formField: true }
} as const;

const productIdsSchema: IValidationSchema = {
    type: 'array',
    items: { type: 'objectIdString' }
} as const;

export const productListSchema: IValidationInputSchema = {
    entityType: productEntity,
    query: {
        ...buildQueryValidationSchema(productsFilterOptions),
        pageContext: { type: 'string', optional: true },
        category: { type: 'string', optional: true }
    }
} as const;

export const productSchema: IValidationInputSchema = {
    entityType: productEntity,
    params: paramsBaseSchema
} as const;

export const productCreateSchema: IValidationInputSchema = {
    entityType: productEntity,
    body: bodyBaseSchema
} as const;

export const productUpdateSchema: IValidationInputSchema = {
    entityType: productEntity,
    params: paramsBaseSchema,
    body: {
        ...bodyBaseSchema,
        imageFilenamesToDelete: {
            type: 'array',
            items: { type: 'string' }
        }
    }
} as const;

export const bulkProductUpdateSchema: IValidationInputSchema = {
    entityType: productEntity,
    body: {
        productIds: productIdsSchema,
        formFields: {
            type: 'object',
            fields: {
                brand: { type: 'string', optional: true, nullable: true, match: true, formField: true },
                unit: { type: 'string', optional: true, enum: PRODUCT_UNITS, formField: true },
                discount: { type: 'float', optional: true, min: 0, max: 100, formField: true },
                category: { type: 'objectIdString', optional: true, formField: true },
                tags: { type: 'string', optional: true, nullable: true, match: true, formField: true },
                isActive: { type: 'boolean', optional: true, formField: true }
            }
        }
    }
} as const;

export const productDeleteSchema: IValidationInputSchema = {
    entityType: productEntity,
    params: paramsBaseSchema
} as const;

export const bulkProductDeleteSchema: IValidationInputSchema = {
    entityType: productEntity,
    body: {
        productIds: productIdsSchema
    }
} as const;
