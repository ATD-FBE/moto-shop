import type { TRequestStatus } from '@shared/types/index.js';

export interface IBaseResponse {
    message: string;
    reason?: TRequestStatus;
}
