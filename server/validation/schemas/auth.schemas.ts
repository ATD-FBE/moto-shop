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
        ['formFields.name']: { type: 'string', form: true },
        ['formFields.email']: { type: 'string', form: true },
        ['formFields.password']: { type: 'string', form: true },
        ['formFields.adminRegCode']: { type: 'string', optional: true, form: true },
        guestCart: {
            type: 'arrayOf',
            arrElemType: 'object',
            arrElemSchema: {
                id: { type: 'objectId' },
                quantity: { type: 'number' },
                ['meta.tags']: {
                    type: 'arrayOf',
                    arrElemType: 'string'
                }
            }
        }
    }
};
