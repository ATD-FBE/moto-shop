import type { TValidationRuleType, TEntityType } from '@shared/types/index.js';

export type TCheckType =
    | 'string' | 'float' | 'integer' | 'boolean' | 'emptyableBoolean' | 'date'
    | 'objectId' | 'objectIdString' | 'array' | 'object' | 'file' | 'files';

export interface IValidationSchema {
    type: TCheckType;                              // Тип значения поля
    fields?: Record<string, IValidationSchema>;    // Для проверки содержимого объектов -> тип object
    items?: IValidationSchema;                     // Для проверки содержимого массивов -> тип array
    optional?: boolean;                            // Для опционального поля -> значение undefined
    nullable?: boolean;                            // Для nullable поля -> значение null
    match?: boolean | TValidationRuleType;         // Для типа string
    min?: number;                                  // Для типов float и integer
    max?: number;                                  // Для типов float и integer
    enum?: readonly (string | number | boolean)[]; // Для типов string, float, integer и boolean
    formField?: boolean;                           // Для поля формы
    errorType?: string;                            // Для поля формы
}

export interface IValidationConfig extends IValidationSchema {
    value: unknown;                             // Заполнение конфига поля значением (кроме эл-в массива)
    fields?: Record<string, IValidationConfig>; // Заполнение значениями конфига вложенного объекта
}

export interface IValidationInputSchema {
    entityType?: TEntityType;
    params?: Record<string, TCheckType>;
    body?: Record<string, IValidationSchema>;
    query?: Record<string, IValidationSchema>;
}
