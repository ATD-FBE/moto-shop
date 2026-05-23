import { useMemo, useState, useEffect } from 'react';
import cn from 'classnames';
import { useAppSelector, useAppDispatch } from '@/hooks/storeHooks.js';
import { resetNewActiveOrders } from '@/redux/slices/uiSlice.js';
import { getInitFilterParams } from '@/helpers/urlParamsHelper.js';
import { isObjectsEqual } from '@shared/commonHelpers.js';
import type { JSX, Dispatch, SetStateAction } from 'react';
import type { TFilterParamsClient, TFilterOption } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface INewActiveOrdersAlertProps {
    search: string;
    setSearch: Dispatch<SetStateAction<string>>;
    filter: TFilterParamsClient;
    setFilter: Dispatch<SetStateAction<TFilterParamsClient>>;
    filterOptions: readonly TFilterOption[];
    page: number;
    setPage: Dispatch<SetStateAction<number>>;
    limit: number;
    totalFilteredOrders: number;
    reloadOrders: () => Promise<boolean | undefined>;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function NewActiveOrdersAlert({
    search,
    setSearch,
    filter,
    setFilter,
    filterOptions,
    page,
    setPage,
    limit,
    totalFilteredOrders,
    reloadOrders
}: INewActiveOrdersAlertProps): JSX.Element {
    const initFilterParams = useMemo(() => getInitFilterParams(null, filterOptions), []);

    const newActiveOrdersCount = useAppSelector(state => state.ui.newActiveOrdersCount);
    const [newActiveOrdersAvailable, setNewActiveOrdersAvailable] = useState(false);
    const dispatch = useAppDispatch();

    const showNewManagedActiveOrders = async (): Promise<void> => {
        const isFilterReseted = isObjectsEqual(filter, initFilterParams);

        if (search !== '' || page !== 1 || !isFilterReseted) {
            setSearch('');
            setPage(1);
            setFilter(initFilterParams);
        } else { // Фильтры сброшены, страница первая => обновление заказов
            setNewActiveOrdersAvailable(false);
            const isSuccess = await reloadOrders();
            if (isSuccess === false) setNewActiveOrdersAvailable(true);
        }
    };

    // Сброс счётчика новых заказов при размонтировании
    useEffect(() => {
        return () => {
            dispatch(resetNewActiveOrders());
        };
    }, [dispatch]);

    // Установка флага доступности новых заказов
    useEffect(() => {
        if (newActiveOrdersCount > 0) setNewActiveOrdersAvailable(true);
    }, [newActiveOrdersCount]);

    // Сброс флага новых заказов при изменении параметров, если заказ на выбранной странице
    useEffect(() => {
        const isFilterReseted = isObjectsEqual(filter, initFilterParams);

        if (search === '' && page === 1 && isFilterReseted) {
            setNewActiveOrdersAvailable(false);
        }
    }, [search, filter, page, limit]);

    // Сброс счётчика новых заказов после изменения их общего количества (уже включает их в себя)
    useEffect(() => {
        dispatch(resetNewActiveOrders());
    }, [totalFilteredOrders, dispatch]);

    return (
        <div className={cn(
            'new-items-alert',
            'active-orders',
            { 'enabled': newActiveOrdersAvailable }
        )}>
            <p>Оформлены новые заказы!</p>
            <button
                className="load-items-btn"
                onClick={showNewManagedActiveOrders}
                disabled={!newActiveOrdersAvailable}
                aria-label="Сбросить фильтры и загрузить новые заказы"
            >
                <span className="icon">🔔</span>
                Сбросить фильтры и загрузить
            </button>
        </div>
    );
}
