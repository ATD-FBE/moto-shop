import { SEARCH_TYPES, ORDER_ADJUSTMENT_TYPE } from '@server/config/constants.js';

export type TSearchTypes = typeof SEARCH_TYPES[keyof typeof SEARCH_TYPES];

export type TOrderAdjustmentTypes = typeof ORDER_ADJUSTMENT_TYPE[keyof typeof ORDER_ADJUSTMENT_TYPE];
