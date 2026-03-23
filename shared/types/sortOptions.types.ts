export interface ISortOptionsEntry {
    dbField: string;
    label: string;
    defaultOrder: 'asc' | 'desc';
    caseInsensitive?: boolean;
}

export interface IParseSortResult {
    sortField: string;
    sortOrder: 1 | -1;
}
