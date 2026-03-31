export interface INews {
    id: string;
    publishDate: string;
    title: string;
    content: string;
    createdBy?: string;
    updateHistory?: { updatedBy: string; updatedAt: string }[];
}
