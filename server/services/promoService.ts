import { PROMO_STORAGE_FOLDER, STORAGE_URL_PATH } from '@server/config/paths.js';
import { getPopulatedDbField } from '@server/utils/dbUtils.js';
import type { TDbPromoBase, TDbPromoManaged } from '@server/types/index.js';
import type { IPromo } from '@shared/types/index.js';

export const preparePromo = (
    dbPromo: TDbPromoBase | TDbPromoManaged,
    { managed = false }: { managed?: boolean } = {}
): IPromo => {
    const baseData = dbPromo as TDbPromoBase;

    const baseFields: IPromo = {
        id: baseData._id.toString(),
        title: baseData.title,
        image: preparePromoImage(baseData._id.toString(), baseData.imageFilename),
        description: baseData.description,
        startDate: baseData.startDate.toISOString(),
        endDate: baseData.endDate.toISOString()
    };

    if (managed) {
        const managedData = dbPromo as TDbPromoManaged;
        
        return {
            ...baseFields,
            createdBy: getPopulatedDbField(managedData.createdBy, 'name'),
            createdAt: managedData.createdAt.toISOString(),
            updateHistory: managedData.updateHistory.map(({ updatedBy, updatedAt }) => ({
                updatedBy: getPopulatedDbField(updatedBy, 'name'),
                updatedAt: updatedAt.toISOString()
            }))
        };
    }

    return baseFields;
};

const preparePromoImage = (
    promoId: string,
    filename?: TDbPromoBase['imageFilename']
): string | undefined => {
    if (!filename) return undefined; // Опциональная картинка
    return [STORAGE_URL_PATH, PROMO_STORAGE_FOLDER, promoId, filename].join('/');
};
