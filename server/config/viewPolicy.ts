import { USER_ROLE, ORDER_VIEW_MODE } from '@shared/constants.js';
import type { TOrderViewMatrix } from '@server/types/index.js';

export const ORDER_VIEW_MATRIX: TOrderViewMatrix = {
    [USER_ROLE.ADMIN]: {
        [ORDER_VIEW_MODE.PAGE]: { inList: false, managed: true, details: true },
        [ORDER_VIEW_MODE.LIST]: { inList: true, managed: false, details: false }
    },
    [USER_ROLE.CUSTOMER]: {
        [ORDER_VIEW_MODE.PAGE]: { inList: false, managed: false, details: true },
        [ORDER_VIEW_MODE.LIST]: { inList: true, managed: false, details: true }
    }
} as const;
