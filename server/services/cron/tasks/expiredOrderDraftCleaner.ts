import cron from 'node-cron';
import Order from '@server/db/models/Order.js';
import { releaseReservedProducts } from '@server/services/checkoutService.js';
import log from '@server/utils/logger.js';
import { runInDbTransaction } from '@server/utils/dbUtils.js';
import { ORDER_STATUS } from '@shared/constants.js';
import type { TDbOrderDraftDoc } from '@server/types/index.js';

const LOG_CTX = '[CRON EXPIRED ORDER DRAFT CLEANER]';

export const startExpiredOrderDraftCleaner = (): void => {
    log.info(`${LOG_CTX} Очистка просроченных черновиков заказов запущена`);

    cron.schedule(
        '*/3 * * * *', // Проверка каждые 3 минут
        async (): Promise<void> => {
            try {
                await runInDbTransaction(async (session) => {
                    const expiredOrderDrafts: TDbOrderDraftDoc[] = await Order.find({
                        currentStatus: ORDER_STATUS.DRAFT,
                        expiresAt: { $lte: new Date() }
                    }).session(session);
        
                    if (!expiredOrderDrafts.length) return;
        
                    const reservedOrderItemList = expiredOrderDrafts.flatMap(order => order.items);
                    await releaseReservedProducts(reservedOrderItemList, session);
        
                    const expiredOrderIds = expiredOrderDrafts.map(order => order._id);
                    await Order.deleteMany({ _id: { $in: expiredOrderIds } }).session(session);
                });
            } catch (err) {
                log.error(`${LOG_CTX} Ошибка фонового удаления просроченных черновиков заказа:`, err);
            }
        }
    );
};
