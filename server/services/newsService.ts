import { getPopulatedDbField } from '@server/utils/dbUtils.js';
import type { TDbNewsBase, TDbNewsManaged } from '@server/types/index.js';
import type { INews } from '@shared/types/index.js';

export const prepareNews = (
    dbNews: TDbNewsBase | TDbNewsManaged, 
    { managed = false }: { managed?: boolean } = {}
): INews => {
    const baseData = dbNews as TDbNewsBase;

    const baseFields: INews = {
        id: baseData._id.toString(),
        publishDate: baseData.publishDate.toISOString(),
        title: baseData.title,
        content: baseData.content
    };

    if (managed) {
        const managedData = dbNews as TDbNewsManaged;
        
        return {
            ...baseFields,
            createdBy: getPopulatedDbField(managedData.createdBy, 'name'),
            updateHistory: managedData.updateHistory.map(({ updatedBy, updatedAt }) => ({
                updatedBy: getPopulatedDbField(updatedBy, 'name'),
                updatedAt: updatedAt.toISOString()
            }))
        };
    }

    return baseFields;
};
