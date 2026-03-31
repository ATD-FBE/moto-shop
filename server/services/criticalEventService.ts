import CriticalEvent from '@server/db/models/CriticalEvent.js';
import log from '@server/utils/logger.js';
import type { TDbCriticalEvent } from '@server/types/index.js';

export const logCriticalEvent = async (
    { logContext, category, reason, data }: {
        logContext?: string,
        category: TDbCriticalEvent['category'],
        reason: TDbCriticalEvent['reason'],
        data: TDbCriticalEvent['data']
    }
): Promise<void> => {
    const eventDoc = { category, reason, data };

    log.error(`[CRITICAL EVENT]${logContext ? ` ${logContext}` : ''}`, eventDoc);

    try {
        await CriticalEvent.create(eventDoc);
    } catch (err) {
        log.error('[FAILED TO SAVE CRITICAL EVENT]', err, { eventToSave: eventDoc });
    }
};
