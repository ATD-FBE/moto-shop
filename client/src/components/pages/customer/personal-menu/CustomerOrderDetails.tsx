import OrderDetailsBase from '@/components/pages/shared/OrderDetailsBase.jsx';
import CardOnlinePaymentLink from '../customer-orders/CardOnlinePaymentLink.jsx';
import OrderRepeatButton from '../customer-orders/OrderRepeatButton.jsx';
import { OrderRefreshButton } from '@/components/parts/OrderParts.jsx';
import { NO_VALUE_LABEL } from '@/config/constants.js';
import type { JSX } from 'react';

export default function CustomerOrderDetails(): JSX.Element {
    return (
        <OrderDetailsBase
            routeKey="customerOrderDetails"
            renderHeaderContent={(orderNumber) => (
                <>
                    <h2>{`Детали заказа №${orderNumber ?? NO_VALUE_LABEL}`}</h2>
                    <p>Подробная информация о заказе</p>
                </>
            )}
            renderCardOnlinePaymentLink={(props) => <CardOnlinePaymentLink {...props} />}
            renderOrderRefreshButton={(props) => <OrderRefreshButton {...props} />}
            renderOrderRepeatButton={(props) => <OrderRepeatButton {...props} />}
        />
    );
}
