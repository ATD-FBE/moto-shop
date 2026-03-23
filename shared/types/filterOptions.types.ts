export interface IFilterQuery {
    timeZoneOffset?: string;
    [key: string]: string | undefined; // Любой строковый ключ со строковым значением, если есть
}

export type TFilterOptionsEntry = INumberFilter | IDateFilter | IBooleanFilter | IStringFilter;

interface IBaseFilter {
    dbField: string;
    label: string;
}

interface INumberFilter extends IBaseFilter {
    type: 'number';
    minParamName: string;
    maxParamName: string;
    minLimit: string;
    maxLimit: string;
}

interface IDateFilter extends IBaseFilter {
    type: 'date';
    minParamName: string;
    maxParamName: string;
    minLimitUTC: string;
    maxLimitUTC: string;
}

interface IBooleanFilter extends IBaseFilter {
    type: 'boolean';
    paramName: string;
    defaultValue?: string;
}

interface IStringFilter extends IBaseFilter {
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
