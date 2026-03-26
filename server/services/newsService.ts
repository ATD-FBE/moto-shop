import type { TNews, TNewsPopulated, TUpdateHistoryItemPopulated } from '@server/types/index.js';

interface IPreparedNews {
    id: string;
    publishDate: Date;
    title: string;
    content: string;
    createdBy?: string;
    updateHistory?: Array<{ updatedBy: string; updatedAt: Date }>;
}

export const prepareNewsData = (
    dbNews: TNews | TNewsPopulated, 
    { managed = false }: { managed?: boolean } = {}
): IPreparedNews => {
    const result: IPreparedNews = {
        id: dbNews._id.toString(),
        publishDate: dbNews.publishDate,
        title: dbNews.title,
        content: dbNews.content,
    };

    if (managed) {
        const populatedNews = dbNews as TNewsPopulated;
        
        result.createdBy = populatedNews.createdBy?.name;
        result.updateHistory = (populatedNews.updateHistory as TUpdateHistoryItemPopulated[])?.map(upd => ({
            updatedBy: upd.updatedBy?.name || 'Удалённый пользователь',
            updatedAt: upd.updatedAt
        }));
    }

    return result;
};
