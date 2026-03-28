export interface IProductFilterQuery {
    inStock?: string;
    brandNew?: string;
    restocked?: string;
    active?: string;
    [key: string]: string | undefined;
}
