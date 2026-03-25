import cron from 'node-cron';
import { startExpiredOrderDraftCleaner } from './tasks/expiredOrderDraftCleaner.js';
import { startInitOnlineTransactionCleaner } from './tasks/initOnlineTransactionCleaner.js';
import log from '@server/utils/logger.js';

export const startCronTasks = (): void => {
    startExpiredOrderDraftCleaner();
    startInitOnlineTransactionCleaner();
};

export const stopCronTasks = (): void => {
    const tasks = cron.getTasks();
    tasks.forEach(task => task.stop());
    log.info(`Остановлено фоновых крон-задач: ${tasks.size}`);
};
