import { USER_ROLE } from '@shared/constants.js';
import type { TOrderViewMatrix } from '@server/types/index.js';

export const ORDER_VIEW_MATRIX: TOrderViewMatrix = {
    [USER_ROLE.ADMIN]: {
        page: { inList: false, managed: true, details: true },
        list: { inList: true, managed: false, details: false }
    },
    [USER_ROLE.CUSTOMER]: {
        page: { inList: false, managed: false, details: true },
        list: { inList: true, managed: false, details: true }
    }
} as const;
