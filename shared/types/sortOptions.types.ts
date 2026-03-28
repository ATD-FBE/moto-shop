export interface ISortOptionsEntry<T> {
    dbField: keyof T;
    label: string;
    defaultOrder: 'asc' | 'desc';
}

export interface IParseSortResult<T> {
    sortField: keyof T;
    sortOrder: 1 | -1;
}
