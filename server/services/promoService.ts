import { PROMO_STORAGE_FOLDER, STORAGE_URL_PATH } from '@server/config/paths.js';
import { getPopulatedDbField } from '@server/utils/dbUtils.js';
import type { TDbPromo } from '@server/types/index.js';
import type { IPromo } from '@shared/types/index.js';

export const preparePromo = (
    dbPromo: TDbPromo,
    { managed = false }: { managed?: boolean; } = {}
): IPromo => ({
    id: dbPromo._id.toString(),
    title: dbPromo.title,
    image: preparePromoImage(dbPromo._id.toString(), dbPromo.imageFilename),
    description: dbPromo.description,
    startDate: dbPromo.startDate.toISOString(),
    endDate: dbPromo.endDate.toISOString(),
    ...(managed && {
        createdBy: getPopulatedDbField(dbPromo.createdBy, 'name'),
        createdAt: dbPromo.createdAt.toISOString(),
        updateHistory: dbPromo.updateHistory.map(({ updatedBy, updatedAt }) => ({
            updatedBy: getPopulatedDbField(updatedBy, 'name'),
            updatedAt: updatedAt.toISOString()
        }))
    })
});

const preparePromoImage = (
    promoId: string,
    filename?: TDbPromo['imageFilename']
): string | undefined => {
    if (!filename) return undefined; // Опциональная картинка
    return [STORAGE_URL_PATH, PROMO_STORAGE_FOLDER, promoId, filename].join('/');
};
