import cn from 'classnames';
import PageLimitSelector from '@/components/common/toolbar/PageLimitSelector.jsx';
import SortingControls from '@/components/common/toolbar/SortingControls.jsx';
import SearchControls from '@/components/common/toolbar/SearchControls.jsx';
import FilterControls from '@/components/common/toolbar/FilterControls.jsx';
import PaginationPages from '@/components/common/toolbar/PaginationPages.jsx';
import PaginationInfo from '@/components/common/toolbar/PaginationInfo.jsx';
import type { JSX, Dispatch, SetStateAction } from 'react';
import type { TToolbarControls, TDataLoadStatus } from '@/types/index.js';
import type { TFilterParamsClient, TFilterOption, ISortOption } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IToolbarProps {
    position?: 'top' | 'bottom';
    activeControls?: TToolbarControls[];
    search?: string;
    setSearch?: Dispatch<SetStateAction<string>>;
    searchPlaceholder?: string;
    filter?: TFilterParamsClient;
    setFilter?: Dispatch<SetStateAction<TFilterParamsClient>>;
    filterOptions?: readonly TFilterOption[];
    sort?: string;
    setSort?: Dispatch<SetStateAction<string>>;
    sortOptions?: readonly ISortOption[];
    page?: number;
    setPage?: Dispatch<SetStateAction<number>>;
    limit?: number;
    setLimit?: Dispatch<SetStateAction<number>>;
    limitOptions?: readonly number[];
    initDataReady?: boolean;
    loadStatus?: TDataLoadStatus;
    totalItems?: number;
    label?: string;
    uiBlocked?: boolean;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function Toolbar({
    position,
    activeControls = [],
    search,
    setSearch,
    searchPlaceholder,
    filter,
    setFilter,
    filterOptions,
    sort,
    setSort,
    sortOptions,
    page,
    setPage,
    limit,
    setLimit,
    limitOptions,
    initDataReady,
    loadStatus,
    totalItems,
    label,
    uiBlocked
}: IToolbarProps): JSX.Element {
    return (
        <div className={cn('toolbar', position ?? '')}>
            {activeControls.map((controls, idx): JSX.Element | null => {
                switch (controls) {
                    case 'limit':
                        return (
                            <PageLimitSelector
                                key={`${idx}-${controls}`}
                                limit={limit}
                                setLimit={setLimit}
                                page={page}
                                setPage={setPage}
                                totalItems={totalItems}
                                options={limitOptions}
                                uiBlocked={uiBlocked}
                            />
                        );

                    case 'sort':
                        return (
                            <SortingControls
                                key={`${idx}-${controls}`}
                                sort={sort}
                                setSort={setSort}
                                options={sortOptions}
                                uiBlocked={uiBlocked}
                            />
                        );

                    case 'search':
                        return (
                            <SearchControls
                                key={`${idx}-${controls}`}
                                search={search}
                                setSearch={setSearch}
                                placeholder={searchPlaceholder}
                                uiBlocked={uiBlocked}
                            />
                        );

                    case 'filter':
                        return (
                            <FilterControls
                                key={`${idx}-${controls}`}
                                filter={filter}
                                setFilter={setFilter}
                                options={filterOptions}
                                uiBlocked={uiBlocked}
                            />
                        );

                    case 'pages':
                        return (
                            <PaginationPages
                                key={`${idx}-${controls}`}
                                currentPage={page}
                                totalItems={totalItems}
                                limit={limit}
                                setPage={setPage}
                                initDataReady={initDataReady}
                                uiBlocked={uiBlocked}
                            />
                        );

                    case 'info':
                        return (
                            <PaginationInfo
                                key={`${idx}-${controls}`}
                                loadStatus={loadStatus}
                                page={page}
                                limit={limit}
                                totalItems={totalItems}
                                label={label}
                            />
                        );

                    default:
                        return null;
                }
            })}
        </div>
    );
}
