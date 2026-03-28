export interface ICommonFilterQuery {
    timeZoneOffset?: string;
    [key: string]: string | undefined; // Любой строковый ключ со строковым значением, если есть
}

export type TFilterOption<T> = 
    | INumberFilter<T> 
    | IDateFilter<T> 
    | IBooleanFilter<T> 
    | IStringFilter<T>;

interface IBaseFilter<T> {
    dbField: keyof T;
    label: string;
}

interface INumberFilter<T> extends IBaseFilter<T> {
    type: 'number';
    minParamName: string;
    maxParamName: string;
    minLimit: string;
    maxLimit: string;
}

interface IDateFilter<T> extends IBaseFilter<T> {
    type: 'date';
    minParamName: string;
    maxParamName: string;
    minLimitUTC: string;
    maxLimitUTC: string;
}

interface IBooleanFilter<T> extends IBaseFilter<T> {
    type: 'boolean';
    paramName: string;
    defaultValue?: string;
}

interface IStringFilter<T> extends IBaseFilter<T> {
    type: 'string';
    paramName: string;
    valueOptions: IFilterValueOptionsEntry[];
    defaultValue?: string;
}

interface IFilterValueOptionsEntry {
    value: string;
    label: string;
    matches?: string[]
}
