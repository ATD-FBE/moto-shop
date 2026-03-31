export interface IPromo {
    id: string;
    title: string;
    image?: string;
    description: string;
    startDate: string;
    endDate: string;
    createdBy?: string;
    createdAt?: string;
    updateHistory?: { updatedBy: string; updatedAt: string }[];
}
