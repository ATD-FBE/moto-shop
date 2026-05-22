import OrderDetailsBase from '@/components/pages/shared/OrderDetailsBase.jsx';
import OrderManagementControls from '@/components/pages/admin/shared/OrderManagementControls.jsx';
import OrderManagementNotes from '@/components/pages/admin/shared/OrderManagementNotes.jsx';
import OrderDetailsSectionEditButton from './order-details-management/OrderDetailsSectionEditButton.jsx';
import OrderDetailsSectionFormCollapsible from './order-details-management/OrderDetailsSectionFormCollapsible.jsx';
import { NO_VALUE_LABEL } from '@/config/constants.js';
import type { JSX } from 'react';

export default function OrderDetailsManagement(): JSX.Element {
    return (
        <OrderDetailsBase
            routeKey="adminOrderDetails"
            subscribeToUpdates={true}
            renderHeaderContent={(orderNumber) => (
                <>
                    <h2>{`Детали заказа №${orderNumber ?? NO_VALUE_LABEL}`}</h2>
                    <p>
                        Просмотр и управление заказом онлайн.
                        Редактирование данных доступно до принятия заказа в обработку.
                    </p>
                </>
            )}
            renderManagementControls={(props) => <OrderManagementControls showExtras={true} {...props} />}
            renderSectionEditButton={(props) => <OrderDetailsSectionEditButton {...props} />}
            renderSectionFormCollapsible={(props) => <OrderDetailsSectionFormCollapsible {...props} />}
            renderManagementNotes={(props) => <OrderManagementNotes {...props} />}
        />
    );
}
