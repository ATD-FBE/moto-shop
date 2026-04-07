import type { TRequestStatus } from '@shared/types/index.js';

/// reqquestLogger ///
export interface ILogRequestStatusConfig {
    context?: string;
    status?: TRequestStatus;
    message?: string;
    details?: unknown;
    unhandled?: boolean;
}
