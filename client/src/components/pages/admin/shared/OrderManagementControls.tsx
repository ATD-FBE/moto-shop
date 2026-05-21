import OrderStatusPanel from './order-management-controls/OrderStatusPanel.jsx';
import FinancialsStatusPanel from './order-management-controls/FinancialsStatusPanel.jsx';
import InternalNotePanel from './order-management-controls/InternalNotePanel.jsx';
import AuditLogPanel from './order-management-controls/AuditLogPanel.jsx';
import type { JSX } from 'react';
import type {
    IOrderStatusEntry,
    IOrderStatusEntrySummary,
    TDeliveryMethod,
    TPaymentMethod,
    TFinancialsState,
    IFinancialsEventEntry,
    IFinancialsEventEntrySummary,
    IAuditLogEntry
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

export interface IOrderManagementControlsProps {
    showExtras?: boolean;
    isActiveOrder: boolean;
    orderId: string;
    currentOrderStatusEntry: IOrderStatusEntry | IOrderStatusEntrySummary;
    orderStatusHistory: (IOrderStatusEntry | IOrderStatusEntrySummary)[];
    deliveryMethod: TDeliveryMethod;
    allowCourierExtra?: boolean;
    shippingCost?: number | null;
    defaultPaymentMethod: TPaymentMethod;
    financialsState: TFinancialsState;
    financialsEventHistory: (IFinancialsEventEntry | IFinancialsEventEntrySummary)[];
    netPaid: number;
    totalAmount: number;
    internalNote?: string;
    auditLog?: IAuditLogEntry[];
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function OrderManagementControls({
    showExtras = false,
    isActiveOrder,
    orderId,
    currentOrderStatusEntry,
    orderStatusHistory,
    deliveryMethod,
    allowCourierExtra,
    shippingCost,
    defaultPaymentMethod,
    financialsState,
    financialsEventHistory,
    netPaid,
    totalAmount,
    internalNote,
    auditLog
}: IOrderManagementControlsProps): JSX.Element {
    return (
        <div className="order-management-controls">
            <OrderStatusPanel
                showExtras={showExtras}
                isActiveOrder={isActiveOrder}
                orderId={orderId}
                currentOrderStatusEntry={currentOrderStatusEntry}
                orderStatusHistory={orderStatusHistory}
                deliveryMethod={deliveryMethod}
                allowCourierExtra={allowCourierExtra}
                shippingCost={shippingCost}
                netPaid={netPaid}
                totalAmount={totalAmount}
            />

            <FinancialsStatusPanel
                showExtras={showExtras}
                orderId={orderId}
                orderStatus={currentOrderStatusEntry.status}
                defaultPaymentMethod={defaultPaymentMethod}
                financialsState={financialsState}
                financialsEventHistory={financialsEventHistory}
                netPaid={netPaid}
                totalAmount={totalAmount}
            />

            {showExtras && (
                <>
                    <InternalNotePanel
                        orderId={orderId}
                        internalNote={internalNote}
                    />

                    <AuditLogPanel
                        auditLog={auditLog}
                    />
                </>
            )}
        </div>
    );
}
