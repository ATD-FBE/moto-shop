import { useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import { useAppDispatch } from '@/hooks/storeHooks.js';
import CustomerTableRowExpansion from '../CustomerTableRowExpansion.jsx';
import {
    OrderCardOverview,
    OrderCardInfoGrid,
    OrderCardStatusSummary,
    OrderRefreshButton
} from '@/components/parts/OrderParts.jsx';
import { sendCustomerOrderListRequest } from '@/api/customerRequests.js';
import { pluralize } from '@/helpers/textHelpers.js';
import { logRequestStatus, logMissingProps } from '@/helpers/logHelpers.js';
import { getLastFinancialsEventEntry } from '@shared/commonHelpers.js';
import { LOAD_STATUS_MIN_HEIGHT, DATA_LOAD_STATUS } from '@/config/constants.js';
import {
    CUSTOMER_TABLE_ORDERS_LOAD_STEP,
    ORDER_STATUS,
    ORDER_ACTIVE_STATUSES,
    ORDER_VIEW_MODE,
    REQUEST_STATUS
} from '@shared/constants.js';
import type { JSX, ComponentProps } from 'react';
import type { TDataLoadStatus } from '@/types/index.js';
import type { IOrder } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TCustomerTableRowExpansionProps = ComponentProps<typeof CustomerTableRowExpansion>;

interface ICustomerTableOrdersMainProps {
    loadStatus: TDataLoadStatus;
    reloadOrders: () => void;
    totalOrders: number;
    loadedOrderList: IOrder[];
    loadOrders: (limit: number) => void;
    refreshOrderState: (orderId: string, refreshedOrder: IOrder) => void;
    uiBlocked: boolean;
}

type TOrdersLoadStatusProps = Pick<ICustomerTableOrdersMainProps,
    | 'loadStatus'
    | 'reloadOrders'
    | 'totalOrders'
> & {
    loadedOrdersCount: number;
};

type TOrdersLoadControlsProps = Pick<ICustomerTableOrdersMainProps,
    | 'totalOrders'
    | 'loadOrders'
    | 'uiBlocked'
> & {
    loadedOrdersCount: number;
};

type TCustomerTableOrderCardProps = Pick<ICustomerTableOrdersMainProps,
    | 'refreshOrderState'
    | 'uiBlocked'
> & {
    order: IOrder;
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function CustomerTableOrders(
    { customerId, customerName, isExpanded }: TCustomerTableRowExpansionProps
): JSX.Element {
    const [lastUsedLimit, setLastUsedLimit] = useState(CUSTOMER_TABLE_ORDERS_LOAD_STEP);
    
    const [initOrdersReady, setinitOrdersReady] = useState(false);
    const [totalOrders, setTotalOrders] = useState(0);
    const [loadedOrderList, setLoadedOrderList] = useState<IOrder[]>([]);
    const [ordersLoading, setOrdersLoading] = useState(false);
    const [ordersLoadError, setOrdersLoadError] = useState(false);

    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();

    const ordersLoadStatus =
        ordersLoading
            ? DATA_LOAD_STATUS.LOADING
            : ordersLoadError
                ? DATA_LOAD_STATUS.ERROR
                : !loadedOrderList.length
                    ? DATA_LOAD_STATUS.NOT_FOUND
                    : DATA_LOAD_STATUS.READY;

    const isOrderUiBlocked = ordersLoading || ordersLoadError;

    const loadOrders = async (limit: number): Promise<void> => {
        setLastUsedLimit(limit);
        setOrdersLoadError(false);
        setOrdersLoading(true);

        const lastLoadedOrder = loadedOrderList[0];
        const params = new URLSearchParams({
            ...(lastLoadedOrder ? { firstOrderId: loadedOrderList[0]?.id } : {}),
            skip: String(loadedOrderList.length),
            limit: String(limit)
        });
        const urlParams = params.toString();

        const responseData = await dispatch(sendCustomerOrderListRequest(customerId, urlParams));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        logRequestStatus({ context: 'CUSTOMER: LOAD ORDER LIST', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            setOrdersLoadError(true);
        } else {
            const { totalCustomerOrders, customerOrderList, needFullReload } = responseData;

            setTotalOrders(totalCustomerOrders);
            setLoadedOrderList(
                prev => needFullReload
                    ? customerOrderList               // Полная замена списка заказов
                    : [...prev, ...customerOrderList] // Дополнение списка заказов
            );
            setinitOrdersReady(true);
        }
        
        setOrdersLoading(false);
    };

    const refreshOrderState = (orderId: string, refreshedOrder: IOrder): void => {
        setLoadedOrderList(prev => prev.map(order => order.id === orderId ? refreshedOrder : order));
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    useEffect(() => {
        if (isExpanded && !initOrdersReady && !ordersLoading && !ordersLoadError) {
            loadOrders(CUSTOMER_TABLE_ORDERS_LOAD_STEP);
        }
    }, [isExpanded, initOrdersReady, ordersLoading, ordersLoadError]);

    return (
        <div className="customer-table-orders">
            <header className="customer-table-orders-header">
                <h3>Заказы клиента {customerName}</h3>
                <p>(в порядке обновления)</p>
            </header>

            <CustomerTableOrdersMain
                loadStatus={ordersLoadStatus}
                reloadOrders={() => loadOrders(lastUsedLimit)}
                totalOrders={totalOrders}
                loadedOrderList={loadedOrderList}
                loadOrders={loadOrders}
                refreshOrderState={refreshOrderState}
                uiBlocked={isOrderUiBlocked}
            />
        </div>
    );
}

function CustomerTableOrdersMain({
    loadStatus,
    reloadOrders,
    totalOrders,
    loadedOrderList,
    loadOrders,
    uiBlocked,
    refreshOrderState
}: ICustomerTableOrdersMainProps): JSX.Element {
    return (
        <div className="customer-table-orders-main">
            <ul className="order-list">
                {loadedOrderList.map(order => (
                    <li key={order.id} className="order-item">
                        <CustomerTableOrderCard
                            order={order}
                            refreshOrderState={refreshOrderState}
                            uiBlocked={uiBlocked}
                        />
                    </li>
                ))}
            </ul>

            <OrdersLoadStatus
                loadStatus={loadStatus}
                reloadOrders={reloadOrders}
                totalOrders={totalOrders}
                loadedOrdersCount={loadedOrderList.length}
            />

            <OrdersLoadControls
                totalOrders={totalOrders}
                loadedOrdersCount={loadedOrderList.length}
                loadOrders={loadOrders}
                uiBlocked={uiBlocked}
            />
        </div>
    );
}

function OrdersLoadStatus(
    { loadStatus, reloadOrders, totalOrders, loadedOrdersCount }: TOrdersLoadStatusProps
): JSX.Element | null {
    if (loadStatus === DATA_LOAD_STATUS.LOADING) {
        return (
            <div
                className="orders-load-status"
                style={{ height: LOAD_STATUS_MIN_HEIGHT }}
            >
                <p>
                    <span className="icon load">⏳</span>
                    Загрузка заказов...
                </p>
            </div>
        );
    }

    if (loadStatus === DATA_LOAD_STATUS.ERROR) {
        return (
            <div
                className="orders-load-status"
                style={{ height: LOAD_STATUS_MIN_HEIGHT }}
            >
                <p>
                    <span className="icon error">❌</span>
                    Ошибка сервера. Заказы не доступны.
                </p>
                <button className="reload-btn" onClick={reloadOrders}>Повторить</button>
            </div>
        );
    }

    if (loadStatus === DATA_LOAD_STATUS.NOT_FOUND) {
        return (
            <div
                className="orders-load-status"
                style={{ height: LOAD_STATUS_MIN_HEIGHT }}
            >
                <p>
                    <span className="icon not-found">🔎</span>
                    Заказы не найдены.
                </p>
            </div>
        );
    }

    if (loadStatus === DATA_LOAD_STATUS.READY && loadedOrdersCount !== totalOrders) {
        return <p className="orders-load-more-indicator">...</p>;
    }

    return null;
}

function OrdersLoadControls(
    { totalOrders, loadedOrdersCount, loadOrders, uiBlocked }: TOrdersLoadControlsProps
): JSX.Element | null {
    if (loadedOrdersCount === 0 || loadedOrdersCount === totalOrders) return null;

    const ORDERS_LOAD_ALL_LIMIT = 0;
    const restOrdersCount = totalOrders - loadedOrdersCount;
    const isRestGreaterThanStep = restOrdersCount > CUSTOMER_TABLE_ORDERS_LOAD_STEP;
    const ordersLoadMoreLimit = isRestGreaterThanStep
        ? CUSTOMER_TABLE_ORDERS_LOAD_STEP
        : ORDERS_LOAD_ALL_LIMIT;

    const ordersLoadMoreBtnLabel = isRestGreaterThanStep
        ? pluralize(CUSTOMER_TABLE_ORDERS_LOAD_STEP, [
            `Следующий ${CUSTOMER_TABLE_ORDERS_LOAD_STEP} заказ`,
            `Следующие ${CUSTOMER_TABLE_ORDERS_LOAD_STEP} заказа`,
            `Следующие ${CUSTOMER_TABLE_ORDERS_LOAD_STEP} заказов`
        ])
        : pluralize(restOrdersCount, [
            `Оставшийся ${restOrdersCount} заказ`,
            `Оставшиеся ${restOrdersCount} заказа`,
            `Оставшиеся ${restOrdersCount} заказов`
        ]);

    return (
        <div className="orders-load-controls">
            <button
                className="orders-load-more-btn"
                onClick={() => loadOrders(ordersLoadMoreLimit)}
                disabled={uiBlocked}
            >
                <span className="icon">➕</span>
                {ordersLoadMoreBtnLabel}
            </button>

            {isRestGreaterThanStep && (
                <button
                    className="orders-load-all-btn"
                    onClick={() => loadOrders(ORDERS_LOAD_ALL_LIMIT)}
                    disabled={uiBlocked}
                >
                    <span className="icon">📑</span>
                    Все заказы
                </button>
            )}
        </div>
    );
}

function CustomerTableOrderCard(
    { order, refreshOrderState, uiBlocked }: TCustomerTableOrderCardProps
): JSX.Element | null {
    const {
        id, orderNumber, statusHistory: orderStatusHistory, confirmedAt,
        lastActivityAt, totals, totalItems, delivery, financials
    } = order;
    const currentOrderStatusEntry = orderStatusHistory.at(-1);

    if (totalItems == null || currentOrderStatusEntry == null) {
        logMissingProps('CustomerTableOrderCard', { totalItems, currentOrderStatusEntry });
        return null; 
    }

    const isActiveOrder = ORDER_ACTIVE_STATUSES.some(s => s === currentOrderStatusEntry.status);
    const isCompletedOrder = currentOrderStatusEntry.status === ORDER_STATUS.COMPLETED;
    const isCancelledOrder = currentOrderStatusEntry.status === ORDER_STATUS.CANCELLED;

    return (
        <article data-id={id} className={cn(
            'order-card',
            { 'completed': isCompletedOrder },
            { 'cancelled': isCancelledOrder }
        )}>
            {isActiveOrder && <span className="active-order-badge">⚡</span>}

            <OrderCardOverview
                orderId={id}
                orderNumber={orderNumber}
                confirmedAt={confirmedAt}
                totalOrderItems={totalItems}
                totalAmount={totals.totalAmount}
            />

            <OrderCardInfoGrid
                orderId={id}
                orderNumber={orderNumber}
                confirmedAt={confirmedAt}
                totalAmount={totals.totalAmount}
                totalPaid={financials.totalPaid}
                totalRefunded={financials.totalRefunded}
                orderStatus={currentOrderStatusEntry.status}
                defaultPaymentMethod={financials.defaultPaymentMethod}
                deliveryMethod={delivery.deliveryMethod}
                allowCourierExtra={delivery.allowCourierExtra}
                currentOnlineTransaction={financials.currentOnlineTransaction}
            />

            <div className="order-meta mobile-stack">
                <OrderCardStatusSummary
                    lastActivityAt={lastActivityAt}
                    orderStatus={currentOrderStatusEntry.status}
                    financialsState={financials.state}
                    lastFinancialsEventEntry={getLastFinancialsEventEntry(financials.eventHistory)}
                />

                {isActiveOrder && (
                    <div className="order-actions">
                        <OrderRefreshButton
                            orderId={id}
                            viewMode={ORDER_VIEW_MODE.LIST}
                            refreshOrderState={refreshOrderState}
                            uiBlocked={uiBlocked}
                        />
                    </div>
                )}
            </div>
        </article>
    );
}
