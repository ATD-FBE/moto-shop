import OrdersBase from '@/components/pages/shared/OrdersBase.jsx';
import OrderManagementControls from '@/components/pages/admin/shared/OrderManagementControls.jsx';
import OrderManagementNotes from '@/components/pages/admin/shared/OrderManagementNotes.jsx';
import NewActiveOrdersAlert from './order-management/NewActiveOrdersAlert.jsx';
import type { JSX } from 'react';

export default function OrderManagement(): JSX.Element {
    return (
        <OrdersBase
            subscribeToUpdates={true}
            headerContent={
                <>
                    <h2>Управление заказами</h2>
                    <p>Данные обновляются в онлайн-режиме</p>
                </>
            }
            renderManagementControls={(props) => <OrderManagementControls {...props} />}
            renderManagementNotes={(props) => <OrderManagementNotes {...props} />}
            renderNewActiveOrdersAlert={(props) => <NewActiveOrdersAlert {...props} />}
        />
    );
}
