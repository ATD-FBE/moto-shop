import { DELIVERY_METHOD, PAYMENT_METHOD } from '@shared/constants.js';
import type { IValidationSchema, IValidationInputSchema } from '@server/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TAuthEntity = typeof authEntity;
type TCheckoutEntity = typeof checkoutEntity;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const authEntity = 'auth';
const checkoutEntity = 'checkout';

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

export const authRegistrationSchema: IValidationInputSchema<TAuthEntity> = {
    entityType: authEntity,
    body: {
        formFields: {
            type: 'object',
            fields: {
                name: { type: 'string', match: true, formField: true },
                email: { type: 'string', match: true, formField: true },
                password: { type: 'string', match: true, formField: true },
                adminRegCode: { type: 'string', optional: true, match: true, formField: true }
            }
        },
        guestCart: guestCartSchema
    }
} as const;

export const authLoginSchema: IValidationInputSchema<TAuthEntity> = {
    entityType: authEntity,
    body: {
        formFields: {
            type: 'object',
            fields: {
                name: { type: 'string', match: true, formField: true, errorType: 'login' },
                password: { type: 'string', match: true, formField: true, errorType: 'login' },
                rememberMe: { type: 'boolean' }
            }
        },
        guestCart: guestCartSchema
    }
} as const;

export const authUserUpdateSchema: IValidationInputSchema<TAuthEntity> = {
    entityType: authEntity,
    body: {
        newName: { type: 'string', optional: true, match: true, formField: true },
        newEmail: { type: 'string', optional: true, match: true, formField: true },
        currentPassword: { type: 'string', optional: true, match: true, formField: true },
        newPassword: { type: 'string', optional: true, match: true, formField: true }
    }
} as const;

export const authSessionSchema: IValidationInputSchema<TAuthEntity> = {
    entityType: authEntity,
    body: {
        guestCart: guestCartSchema
    }
} as const;

export const authCheckoutPrefsUpdateSchema: IValidationInputSchema<TCheckoutEntity> = {
    entityType: checkoutEntity,
    body: {
        firstName: { type: 'string', optional: true, match: true, formField: true },
        lastName: { type: 'string', optional: true, match: true, formField: true },
        middleName: { type: 'string', optional: true, match: true, formField: true },
        email: { type: 'string', optional: true, match: true, formField: true },
        phone: { type: 'string', optional: true, match: true, formField: true },
        deliveryMethod: {
            type: 'string',
            optional: true,
            enum: Object.values(DELIVERY_METHOD),
            formField: true
        },
        allowCourierExtra: { type: 'boolean', optional: true, formField: true },
        region: { type: 'string', optional: true, match: true, formField: true },
        district: { type: 'string', optional: true, match: true, formField: true },
        city: { type: 'string', optional: true, match: true, formField: true },
        street: { type: 'string', optional: true, match: true, formField: true },
        house: { type: 'string', optional: true, match: true, formField: true },
        apartment: { type: 'string', optional: true, match: true, formField: true },
        postalCode: { type: 'string', optional: true, match: true, formField: true },
        defaultPaymentMethod: {
            type: 'string',
            optional: true,
            enum: Object.values(PAYMENT_METHOD),
            formField: true
        }
    }
} as const;
