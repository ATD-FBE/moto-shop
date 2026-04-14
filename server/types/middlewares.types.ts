import type { TCheckType, IInputTypeMapConfig } from './utils.types.js';
import type { TEntityType, TEntityField } from '@shared/types/index.js';

type TFieldSchemaConfig = Omit<IInputTypeMapConfig, 'value'>;

export interface IValidateInputSchema<E extends TEntityType = TEntityType> {
    entityType?: E;
    params?: Record<string, TCheckType>;
    body?: {
        [K in TEntityField<E>]?: TFieldSchemaConfig;
    } & {
        [key: string]: TFieldSchemaConfig;
    };
    query?: Record<string, TFieldSchemaConfig>;
}
