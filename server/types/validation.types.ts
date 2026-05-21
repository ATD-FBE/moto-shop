import type { Types } from 'mongoose';
import type { TValidationRuleType, TEntityType, TEntityField } from '@shared/types/index.js';

export interface ITypeCheckMap {
    string: string;
    float: number;
    integer: number;
    boolean: boolean;
    date: Date;
    array: unknown[];
    object: Record<string | number | symbol, unknown>;
    objectId: Types.ObjectId;
    objectIdString: string;
    file: Express.Multer.File;
    files: Express.Multer.File[];
}

export type TCheckType = keyof ITypeCheckMap;

export interface IValidationSchema {
    type: TCheckType;                              // Тип значения поля
    fields?: Record<string, IValidationSchema>;    // Для проверки содержимого объектов -> тип object
    items?: IValidationSchema;                     // Для проверки содержимого массивов -> тип array
    optional?: boolean;                            // Для опционального поля -> значение undefined
    nullable?: boolean;                            // Для nullable поля -> значение null
    emptyable?: boolean;                           // Для валидной пустой строки -> значение ''
    match?: boolean | TValidationRuleType;         // Для типа string
    min?: number;                                  // Для типов float и integer
    max?: number;                                  // Для типов float и integer
    enum?: readonly (string | number | boolean)[]; // Для типов string, float, integer и boolean
    formField?: boolean;                           // Для поля формы
    errorType?: string;                            // Для поля формы
    dynamicErrorConfig?: IDynamicErrorConfig;
}

export interface IDynamicErrorConfig {
    idField: string;                               // Ключ в объекте с ошибочным полем
    entityField: string;                           // Общее поле ошибки для указанной сущности
    generateFieldName: (id: string) => string;     // Функция, генерирующая имя по ключу
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
