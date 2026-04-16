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
            fieldConfigs: {
                name: { type: 'string', form: true },
                email: { type: 'string', form: true },
                password: { type: 'string', form: true },
                adminRegCode: { type: 'string', optional: true, form: true }
            }
        },
        guestCart: {
            type: 'arrayOf',
            arrElemConfig: {
                type: 'object',
                fieldConfigs: {
                    id: { type: 'objectId', form: true },
                    quantity: { type: 'integer', min: 0 },
                    ['meta.tags']: {
                        type: 'arrayOf',
                        arrElemConfig: { type: 'string' }
                    }
                },
                optional: true
            }
        }
    }
};
