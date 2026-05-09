import { formatProductTitle, formatCurrency } from '@/helpers/textHelpers.js';
import type { IProductAdjustment } from '@shared/types/index.js';

export const formatCheckoutAdjustmentLogs = (productAdjustments: IProductAdjustment[]): string => {
    const logs: string[] = [];
    let num = 0;

    const addLog = (message: string): void => {
        logs.push(`<span className="bold">${++num}.</span> ${message}`);
    }

    for (const item of productAdjustments) {
        const { id, name, brand, adjustments } = item;
        const productTitle = formatProductTitle(name, brand) || `Товар (ID: ${id})`;
        const productTitleHtml = `<span className="cursive underline">"${productTitle}"</span>`;

        if (adjustments.deleted) {
            addLog(`Товар <span className="color-red">удалён</span>: ${productTitleHtml}.`);
        }

        if (adjustments.inactive) {
            addLog(`Товар <span className="color-red">снят с продажи</span>: ${productTitleHtml}.`);
        }

        if (adjustments.outOfStock) {
            addLog(`Товар <span className="color-red">закончился</span>: ${productTitleHtml}.`);
        }

        if (adjustments.quantityReduced) {
            const { old, corrected } = adjustments.quantityReduced;
            addLog(
                `<span className="color-red">Уменьшено количество</span> товара ${productTitleHtml}: ` +
                `с <span className="bold color-blue">${old}</span> ` +
                `до <span className="bold color-green">${corrected}</span>.`
            );
        }

        if (adjustments.price) {
            const { old, corrected } = adjustments.price;
            addLog(
                `<span className="color-red">Изменена цена</span> на товар ${productTitleHtml}: ` +
                `с <span className="bold color-blue">${formatCurrency(old)}</span> ` +
                `до <span className="bold color-green">${formatCurrency(corrected)}</span> ₽.`
            );
        }

        if (adjustments.discount) {
            const { old, corrected, source } = adjustments.discount;

            const sourceLabel = ({
                customer: 'клиентская скидка',
                product: 'скидка на товар',
                none: 'скидка отменена'
            })[source];

            addLog(
                `<span className="color-red">Изменена скидка</span> на товар ${productTitleHtml}: ` +
                `с <span className="bold color-blue">${old}%</span> ` +
                `до <span className="bold color-green">${corrected}%</span>` +
                `${sourceLabel ? ` (<span className="color-brown">${sourceLabel}</span>)` : ''}.`
            );
        }
    }

    return logs.join('\n\n');
};
