import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppLocation } from '@/hooks/storeHooks.js';
import Collapsible from '@/components/common/Collapsible.jsx';
import NotificationEditor from './customer-management/NotificationEditor.jsx';
import Toolbar from '@/components/common/Toolbar.jsx';
import CustomerTable from './customer-management/CustomerTable.jsx';
import {
    sendCustomerListRequest,
    sendCustomerDiscountUpdateRequest,
    sendCustomerBanStatusUpdateRequest
} from '@/api/customerRequests.js';
import { routeConfig } from '@/config/appRouting.js';
import { DATA_LOAD_STATUS } from '@/config/constants.js';
import { openAlertModal } from '@/services/modalAlertService.js';
import {
    getInitFilterParams,
    getInitSortParam,
    getInitPageParam,
    getInitLimitParam
} from '@/helpers/urlParamsHelper.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { customersFilterOptions } from '@shared/filterOptions.js';
import { customersPageLimitOptions } from '@shared/pageLimitOptions.js';
import { customersSortOptions } from '@shared/sortOptions.js';
import { trimSetByFilter } from '@shared/commonHelpers.js';
import { REQUEST_STATUS } from '@shared/constants.js';
import type { JSX } from 'react';
import type { IUpdateCustomerDiscountResult } from '@/types/index.js';
import type {
    TFilterParamsClient,
    ICustomer,
    ICustomerDiscountUpdateBody,
    ICustomerBanStatusUpdateBody
} from '@shared/types/index.js';

export default function CustomerManagement(): JSX.Element | null {
    const [initialized, setInitialized] = useState(false);
    
    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<TFilterParamsClient>({});
    const [sort, setSort] = useState<string>(customersSortOptions[0].dbField);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState<number>(customersPageLimitOptions[0]);

    const [initCustomersReady, setInitCustomersReady] = useState(false);
    const [customersLoading, setCustomersLoading] = useState(true);
    const [customersLoadError, setCustomersLoadError] = useState(false);
    const [customerOperationBusy, setCustomerOperationBusy] = useState(false);
    const [filteredCustomerNamesMap, setFilteredCustomerNamesMap] = useState<Record<string, string>>({});
    const [paginatedCustomerList, setPaginatedCustomerList] = useState<ICustomer[]>([]);
    const [filteredCustomerIds, setFilteredCustomerIds] = useState<Set<string>>(new Set());
    const [selectedCustomerIds, setSelectedCustomerIds] = useState<Set<string>>(new Set());
    const [expandedCustomerIds, setExpandedCustomerIds] = useState<Set<string>>(new Set());

    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();
    const location = useAppLocation();
    const navigate = useNavigate();

    const [locationState] = useState(location.state);
    const [isNotifEditorExpanded, setIsNotifEditorExpanded] = useState(
        locationState?.isNotificationEditorExpanded || false
    );

    const customersLoadStatus =
        customersLoading
            ? DATA_LOAD_STATUS.LOADING
            : customersLoadError
                ? DATA_LOAD_STATUS.ERROR
                : !filteredCustomerIds.size
                    ? DATA_LOAD_STATUS.NOT_FOUND
                    : DATA_LOAD_STATUS.READY;

    const isCustomerUiBlocked =
        customersLoading ||
        customersLoadError ||
        customerOperationBusy;

    const loadCustomers = async (urlParams: string): Promise<void> => {
        setCustomersLoadError(false);
        setCustomersLoading(true);

        const responseData = await dispatch(sendCustomerListRequest(urlParams));
        if (isUnmountedRef.current) return;
        
        const { status, message } = responseData;
        logRequestStatus({ context: 'CUSTOMER: LOAD LIST', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            setCustomersLoadError(true);
        } else {
            const { filteredCustomerNamesMap, paginatedCustomerList } = responseData;

            setFilteredCustomerNamesMap(filteredCustomerNamesMap);
            setFilteredCustomerIds(new Set(Object.keys(filteredCustomerNamesMap)));
            setPaginatedCustomerList(paginatedCustomerList);
            setInitCustomersReady(true);
        }

        setCustomersLoading(false);
    }

    const reloadCustomers = async (): Promise<void> => {
        const urlParams = location.search.slice(1);
        await loadCustomers(urlParams);
    };

    const applyCustomerUpdates = (
        customerId: string,
        customerUpdateData: Partial<ICustomer>
    ): void =>
        setPaginatedCustomerList(prev => prev.map(customer =>
            customer.id === customerId
                ? { ...customer, ...customerUpdateData }
                : customer
        ));

    const updateCustomerDiscount = async (
        customerId: string,
        objData: ICustomerDiscountUpdateBody
    ): Promise<IUpdateCustomerDiscountResult | undefined> => {
        setCustomerOperationBusy(true);

        const responseData = await dispatch(sendCustomerDiscountUpdateRequest(customerId, objData));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        const fieldErrors = status === REQUEST_STATUS.INVALID ? responseData.fieldErrors : null;

        logRequestStatus({
            context: 'CUSTOMER: UPDATE DISCOUNT',
            status,
            message,
            ...(fieldErrors && { details: fieldErrors })
        });
        
        if (status !== REQUEST_STATUS.SUCCESS) {
            return {
                success: false,
                ...(fieldErrors && { fieldErrors }),
                onComplete: function() {
                    if (!fieldErrors) {
                        openAlertModal({
                            type: 'error',
                            dismissible: false,
                            title: 'Не удалось изменить клиентскую скидку',
                            message:
                                'Ошибка при изменении скидки клиента.\n' +
                                'Подробности ошибки в консоли.'
                        });
                    }
                    setCustomerOperationBusy(false);
                }
            };
        }
        
        return {
            success: true,
            onComplete: function() {
                applyCustomerUpdates(customerId, responseData.customerUpdateData);
                setCustomerOperationBusy(false);
            }
        };
    };

    const updateCustomerBanStatus = async (
        customerId: string,
        objData: ICustomerBanStatusUpdateBody
    ): Promise<void> => {
        setCustomerOperationBusy(true);

        const responseData = await dispatch(sendCustomerBanStatusUpdateRequest(customerId, objData));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        logRequestStatus({ context: 'CUSTOMER: TOGGLE BAN', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            openAlertModal({
                type: 'error',
                dismissible: false,
                title: 'Не удалось изменить статус бана',
                message:
                    'Ошибка при изменении статуса блокировки клиента.\n' +
                    'Подробности ошибки в консоли.'
            });
        } else {
            applyCustomerUpdates(customerId, responseData.customerUpdateData);
        }

        setCustomerOperationBusy(false);
    };

    const toggleAllCustomerSelection = (areAllCustomersSelected: boolean): void => {
        if (!filteredCustomerIds.size) return;
        setSelectedCustomerIds(new Set(areAllCustomersSelected ? [] : filteredCustomerIds));
    };

    const toggleCustomerSelection = (customerId: string): void => {
        setSelectedCustomerIds(prev => {
            const newSelection = new Set(prev);

            if (newSelection.has(customerId)) {
                newSelection.delete(customerId);
            } else {
                newSelection.add(customerId);
            }
    
            return newSelection;
        });
    };

    const toggleCustomerExpansion = (customerId: string): void => {
        setExpandedCustomerIds(prev => {
            const newExpandedSet = new Set(prev);

            if (newExpandedSet.has(customerId)) {
                newExpandedSet.delete(customerId);
            } else {
                newExpandedSet.add(customerId);
            }

            return newExpandedSet;
        });
    };

    // Очистка при размонтировании
    useEffect(() => {
        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Установка начальных значений параметров при первой загрузке
    useEffect(() => {
        const params = new URLSearchParams(location.search);

        setSearch(params.get('search') || '');
        setFilter(getInitFilterParams(params, customersFilterOptions));
        setSort(getInitSortParam(params, customersSortOptions));
        setPage(getInitPageParam(params));
        setLimit(getInitLimitParam(params, customersPageLimitOptions));
        
        setInitialized(true);
    }, []);

    // Обновление URL и загрузка клиентов с обновлёнными параметрами
    useEffect(() => {
        if (!initialized) return;

        const hasDateFilter = customersFilterOptions.some(option =>
            option.type === 'date' &&
            (filter[option.minParamName] || filter[option.maxParamName])
        );
        const params = new URLSearchParams({
            page: String(page),
            limit: String(limit),
            search,
            sort,
            ...filter,
            ...(hasDateFilter && { timeZoneOffset: String(new Date().getTimezoneOffset()) })
        });
        const urlParams = params.toString();

        if (location.search !== `?${urlParams}`) {
            const newUrl = `${location.pathname}?${urlParams}`;
            navigate(newUrl, { replace: true }); // Также очищается loacation.state
        }

        loadCustomers(urlParams);
    }, [initialized, search, filter, sort, page, limit]);

    // Удаление отсутствующих в загруженной выборке клиентов из выбранных и раскрытых ранее
    useEffect(() => {
        const [trimmedSelected, selectedChanged] =
            trimSetByFilter(selectedCustomerIds, filteredCustomerIds);
        const [trimmedExpanded, expandedChanged] =
            trimSetByFilter(expandedCustomerIds, filteredCustomerIds);
    
        if (selectedChanged) setSelectedCustomerIds(trimmedSelected);
        if (expandedChanged) setExpandedCustomerIds(trimmedExpanded);
    }, [filteredCustomerIds]);

    if (!initialized) return null;

    return (
        <div className="customer-management-page">
            <header className="customer-management-header">
                <h2>Список клиентов</h2>
                <p>Поиск, оповещение, управление скидками и доступом</p>
            </header>

            <div className="customers-notification">
                <div className="customers-notification-controls">
                    <button
                        className={isNotifEditorExpanded ? 'enabled' : undefined}
                        onClick={() => setIsNotifEditorExpanded(prev => !prev)}
                    >
                        <span className="icon">📝</span>
                        Написать уведомление
                    </button>
                    <button
                        onClick={() => navigate(routeConfig.adminNotifications.paths[0])}
                        aria-label="Перейти к управлению уведомлениями"
                    >
                        <span className="icon">📜</span>
                        Просмотр уведомлений
                    </button>
                </div>

                <Collapsible
                    isExpanded={isNotifEditorExpanded}
                    className="notification-editor-collapsible"
                >
                    <NotificationEditor
                        notificationId={locationState?.notificationId || null}
                        filteredCustomerNamesMap={filteredCustomerNamesMap}
                        selectedCustomerIds={selectedCustomerIds}
                        setSelectedCustomerIds={setSelectedCustomerIds}
                    />
                </Collapsible>
            </div>
            
            <Toolbar
                position="top"
                activeControls={['limit', 'sort', 'search', 'filter', 'pages']}
                search={search}
                setSearch={setSearch}
                searchPlaceholder="По ID, логину или email клиента"
                filter={filter}
                setFilter={setFilter}
                filterOptions={customersFilterOptions}
                sort={sort}
                setSort={setSort}
                sortOptions={customersSortOptions}
                page={page}
                setPage={setPage}
                limit={limit}
                setLimit={setLimit}
                limitOptions={customersPageLimitOptions}
                initDataReady={initCustomersReady}
                totalItems={filteredCustomerIds.size}
                uiBlocked={isCustomerUiBlocked}
            />

            <CustomerTable
                loadStatus={customersLoadStatus}
                customers={paginatedCustomerList}
                filteredIds={filteredCustomerIds}
                selectedIds={selectedCustomerIds}
                expandedIds={expandedCustomerIds}
                onToggleAllSelection={toggleAllCustomerSelection}
                onToggleSelection={toggleCustomerSelection}
                onToggleExpansion={toggleCustomerExpansion}
                onUpdateDiscount={updateCustomerDiscount}
                onUpdateBanStatus={updateCustomerBanStatus}
                onReload={reloadCustomers}
                uiBlocked={isCustomerUiBlocked}
            />

            <Toolbar
                position="bottom"
                activeControls={['info', 'pages']}
                page={page}
                setPage={setPage}
                limit={limit}
                loadStatus={customersLoadStatus}
                initDataReady={initCustomersReady}
                totalItems={filteredCustomerIds.size}
                label="Клиенты"
                uiBlocked={isCustomerUiBlocked}
            />
        </div>
    );
}
