import type { IOrderStatusEntry, IFinancialsEventEntry, IAuditLogEntry } from './order.types.js';
import type { IDotNotationPatch } from './shared.types.js';

// SSE администратора
export interface IAdminSseMessageData {
    newActiveOrdersChange?: number;
    orderUpdate?: IOrderUpdate;
}
export interface IOrderUpdate {
    orderId: string;
    orderUpdateData: IOrderUpdateData;
}
export interface IOrderUpdateData {
    orderPatches?: IDotNotationPatch[];
    newOrderStatusEntry?: IOrderStatusEntry;
    newFinancialsEventEntry?: IFinancialsEventEntry;
    voidedFinancialsEventEntry?: IFinancialsEventEntry;
    lastFinancialsEventEntry?: IFinancialsEventEntry | null;
    newAuditLogEntry?: IAuditLogEntry;
}

// SSE покупателя
export interface ICustomerSseMessageData {
    newUnreadNotificationsChange: number;
}
