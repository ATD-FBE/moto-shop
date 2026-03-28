import type { TDbNews, TDbNewsPopulated, TDbUpdateHistoryItemPopulated } from '@server/types/index.js';

interface IPreparedNews {
    id: string;
    publishDate: Date;
    title: string;
    content: string;
    createdBy?: string;
    updateHistory?: Array<{ updatedBy: string; updatedAt: Date }>;
}

export const prepareNewsData = (
    dbNews: TDbNews | TDbNewsPopulated, 
    { managed = false }: { managed?: boolean } = {}
): IPreparedNews => {
    const result: IPreparedNews = {
        id: dbNews._id.toString(),
        publishDate: dbNews.publishDate,
        title: dbNews.title,
        content: dbNews.content,
    };

    if (managed) {
        const populatedNews = dbNews as TDbNewsPopulated;
        
        result.createdBy = populatedNews.createdBy?.name;
        result.updateHistory = (populatedNews.updateHistory as TDbUpdateHistoryItemPopulated[])?.map(upd => ({
            updatedBy: upd.updatedBy?.name || 'Удалённый пользователь',
            updatedAt: upd.updatedAt
        }));
    }

    return result;
};
