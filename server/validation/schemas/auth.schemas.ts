import type { IValidationInputSchema } from '@server/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TAuthEntity = typeof authEntity;

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const authEntity = 'auth';

export const authRegistrationSchema: IValidationInputSchema<TAuthEntity> = {
    entityType: authEntity,
    body: {
        formFields: {
            type: 'object',
            fields: {
                name: { type: 'string', formField: true },
                email: { type: 'string', formField: true },
                password: { type: 'string', formField: true },
                adminRegCode: { type: 'string', optional: true, formField: true }
            }
        },
        guestCart: {
            type: 'array',
            items: {
                type: 'object',
                fields: {
                    id: { type: 'objectId' },
                    quantity: { type: 'integer', min: 0 }
                }
            }
        }
    }
};
