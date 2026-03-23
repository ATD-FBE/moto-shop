import { SEARCH_TYPES } from '@server/config/constants.js';

export type TSearchTypes = typeof SEARCH_TYPES[keyof typeof SEARCH_TYPES];
