import type { TActiveUserRole } from '@shared/types/index.js';

export type TOrderViewMatrix = Record<TActiveUserRole, IOrderViewMatrixEntry>;

interface IOrderViewMatrixEntry {
    readonly page: IOrderViewConfig;
    readonly list: IOrderViewConfig;
}

interface IOrderViewConfig {
    readonly inList: boolean;
    readonly managed: boolean;
    readonly details: boolean;
}
