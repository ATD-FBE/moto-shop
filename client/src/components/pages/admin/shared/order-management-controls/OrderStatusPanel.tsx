import { useState, useEffect }  from 'react';
import cn from 'classnames';
import OrderManagementControls from '../OrderManagementControls.jsx';
import OrderStatusSteps from './order-status-panel/OrderStatusSteps.jsx';
import CheckboxCollapsible from '@/components/common/CheckboxCollapsible.jsx';
import { NO_VALUE_LABEL } from '@/config/constants.js';
import { formatOrderStatusHistoryLogs, isFullOrderStatusEntry } from '@/services/orderService.js';
import { logMissingProps } from '@/helpers/logHelpers.js';
import { ORDER_STATUS_CONFIG } from '@shared/constants.js';
import type { JSX, ComponentProps } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TParentProps = ComponentProps<typeof OrderManagementControls>;

type TOrderStatusPanelProps = Pick<TParentProps,
    | 'isActiveOrder'
    | 'orderId'
    | 'orderStatusHistory'
    | 'deliveryMethod'
    | 'allowCourierExtra'
    | 'shippingCost'
    | 'netPaid'
    | 'totalAmount'
> & {
    showExtras: boolean;
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function OrderStatusPanel({
    showExtras,
    isActiveOrder,
    orderId,
    orderStatusHistory,
    deliveryMethod,
    allowCourierExtra,
    shippingCost,
    netPaid,
    totalAmount
}: TOrderStatusPanelProps): JSX.Element | null {
    const currentOrderStatusEntry = orderStatusHistory.at(-1);

    if (currentOrderStatusEntry == null) {
        logMissingProps('OrderStatusPanel', { currentOrderStatusEntry });
        return null; 
    }

    const [logs, setLogs] = useState('');

    const currentOrderStatusConfig = ORDER_STATUS_CONFIG[currentOrderStatusEntry.status];
    const currentOrderStatusDate = new Date(currentOrderStatusEntry.changedAt).toLocaleString();

    useEffect(() => {
        if (!showExtras) return;
        setLogs(formatOrderStatusHistoryLogs(orderStatusHistory.filter(isFullOrderStatusEntry)));
    }, [orderStatusHistory]);

    return (
        <div className="order-status-panel">
            <div className="order-status-panel-title">
                <h4>Обработка заказа</h4>
                
                {isActiveOrder && (
                    <div className="badge-box single-badge">
                        <span className="badge">❗</span>
                    </div>
                )}
            </div>

            <div className="order-status-panel-container">
                <p className="current-order-status">
                    <span className="label">{`Текущий статус (от ${currentOrderStatusDate}): `}</span>
                    <span className={cn('value', currentOrderStatusConfig?.intent ?? '')}>
                        {currentOrderStatusConfig?.label ?? NO_VALUE_LABEL}
                    </span>
                </p>

                <CheckboxCollapsible
                    checkboxLabel="Управление заказом"
                    contentClass="order-status-steps"
                >
                    <OrderStatusSteps
                        orderId={orderId}
                        currentOrderStatus={currentOrderStatusEntry.status}
                        lastActiveOrderStatus={currentOrderStatusEntry.lastActiveStatus}
                        deliveryMethod={deliveryMethod}
                        allowCourierExtra={allowCourierExtra}
                        shippingCost={shippingCost}
                        netPaid={netPaid}
                        totalAmount={totalAmount}
                    />
                </CheckboxCollapsible>

                {showExtras && (
                    <CheckboxCollapsible
                        checkboxLabel="История изменений статуса"
                        contentClass="logs"
                    >
                        <textarea
                            className="logs"
                            value={logs}
                            readOnly
                            spellCheck={false}
                        >
                        </textarea>
                    </CheckboxCollapsible>
                )}
            </div>
        </div>
    );
}
