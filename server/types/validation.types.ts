import type { TEntityType, TEntityField } from '@shared/types/index.js';

export type TCheckType =
    | 'string' | 'number' | 'integer' | 'boolean' | 'emptyableBoolean'
    | 'date' | 'objectId' | 'nullableObjectId' | 'array' | 'object';

export interface IValidationSchema {
    type: TCheckType;                           // Тип значения поля
    fields?: Record<string, IValidationSchema>; // Для проверки содержимого объектов -> тип object
    items?: IValidationSchema;                  // Для проверки содержимого массивов -> тип array
    min?: number;                               // Для типов number и integer
    max?: number;                               // Для типов number и integer
    enumValues?: readonly any[];                // Для типов string, number и integer
    optional?: boolean;                         // Для опционального поля -> значение undefined
    formField?: boolean;                        // Для поля формы
}

export interface IValidationConfig extends IValidationSchema {
    value: unknown;                             // Заполнение конфига поля значением (кроме эл-в массива)
    fields?: Record<string, IValidationConfig>; // Заполнение значениями конфига вложенного объекта
}

export interface IValidationInputSchema<E extends TEntityType = TEntityType> {
    entityType?: E;
    params?: Record<string, TCheckType>;
    body?: Record<string, IValidationSchema>;
    query?: Record<string, IValidationSchema>;
}

export type TValidationConfigMap<E extends TEntityType = TEntityType> = {
    [K in TEntityField<E>]?: IValidationConfig;
} & {
    [key: string]: IValidationConfig;
};
