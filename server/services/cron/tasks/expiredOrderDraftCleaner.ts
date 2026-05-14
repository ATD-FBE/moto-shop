import cron from 'node-cron';
import { OrderDraft } from '@server/db/models/Order.js';
import { releaseReservedProducts } from '@server/services/checkoutService.js';
import log from '@server/utils/logger.js';
import { runInDbTransaction } from '@server/utils/dbUtils.js';
import type { TDbOrderDraft, TSelectedFields } from '@server/types/index.js';

const LOG_CTX = '[CRON EXPIRED ORDER DRAFT CLEANER]';

export const startExpiredOrderDraftCleaner = (): void => {
    log.info(`${LOG_CTX} Очистка просроченных черновиков заказов запущена`);

    cron.schedule(
        '*/3 * * * *', // Проверка каждые 3 минут
        async (): Promise<void> => {
            try {
                await runInDbTransaction(async (session) => {
                    const selectedFields: TSelectedFields<TDbOrderDraft> = { _id: 1, items: 1 };
                    const expiredOrderDrafts = await OrderDraft
                        .find({ expiresAt: { $lte: new Date() } })
                        .select(selectedFields)
                        .lean<TDbOrderDraft[]>()
                        .session(session);
        
                    if (!expiredOrderDrafts.length) return;
        
                    const orderItemsToRelease = expiredOrderDrafts.flatMap(order => order.items);
                    await releaseReservedProducts(orderItemsToRelease, session);
        
                    const expiredOrderIds = expiredOrderDrafts.map(order => order._id);
                    await OrderDraft.deleteMany({ _id: { $in: expiredOrderIds } }).session(session);
                });
            } catch (err) {
                log.error(`${LOG_CTX} Ошибка фонового удаления просроченных черновиков заказа:`, err);
            }
        }
    );
};
