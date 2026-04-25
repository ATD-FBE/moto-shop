export interface ICategory {
    id: string;
    
}

export type TCategoryMap = Record<string, ICategory & {
    parent?: string | null;
    subcategories: ICategory[];
    [key: string]: any;
}>;
