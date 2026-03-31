import { getPopulatedDbField } from '@server/utils/dbUtils.js';
import type { TDbNews } from '@server/types/index.js';
import type { INews } from '@shared/types/index.js';

export const prepareNews = (
    dbNews: TDbNews, 
    { managed = false }: { managed?: boolean } = {}
): INews => ({
    id: dbNews._id.toString(),
    publishDate: dbNews.publishDate.toISOString(),
    title: dbNews.title,
    content: dbNews.content,
    ...(managed && {
        createdBy: getPopulatedDbField(dbNews.createdBy, 'name'),
        updateHistory: dbNews.updateHistory.map(({ updatedBy, updatedAt }) => ({
            updatedBy: getPopulatedDbField(updatedBy, 'name'),
            updatedAt: updatedAt.toISOString()
        }))
    })
});
