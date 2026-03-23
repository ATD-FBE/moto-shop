export type TPageLimitOptionsEntry = number;

export interface IPageLimitQuery {
    sort?: string;
    page?: string;
    limit?: string;
    [key: string]: string | undefined; // Любой строковый ключ со строковым значением, если есть
}
