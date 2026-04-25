import cn from 'classnames';
import PageLimitSelector from '@/components/common/toolbar/PageLimitSelector.jsx';
import SortingControls from '@/components/common/toolbar/SortingControls.jsx';
import SearchControls from '@/components/common/toolbar/SearchControls.jsx';
import FilterControls from '@/components/common/toolbar/FilterControls.jsx';
import PaginationPages from '@/components/common/toolbar/PaginationPages.jsx';
import PaginationInfo from '@/components/common/toolbar/PaginationInfo.jsx';
import type { JSX, Dispatch, SetStateAction } from 'react';
import type { TToolbarControls, TDataLoadStatus } from '@/types/index.js';
import type { TFilterParams, TFilterOption, ISortOption } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IToolbarProps {
    position?: 'top' | 'bottom';
    activeControls?: TToolbarControls[];
    uiBlocked?: boolean;
    initDataReady?: boolean;
    loadStatus?: TDataLoadStatus;
    search?: string;
    setSearch?: Dispatch<SetStateAction<string>>;
    searchPlaceholder?: string;
    filter?: TFilterParams;
    setFilter?: Dispatch<SetStateAction<TFilterParams>>;
    filterOptions?: readonly TFilterOption[];
    sort?: string;
    setSort?: Dispatch<SetStateAction<string>>;
    sortOptions?: readonly ISortOption[];
    page?: number;
    setPage?: Dispatch<SetStateAction<number>>;
    limit?: number;
    setLimit?: Dispatch<SetStateAction<number>>;
    limitOptions?: readonly number[];
    totalItems?: number;
    label?: string;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function Toolbar({
    position,
    activeControls = [],
    uiBlocked,
    initDataReady,
    loadStatus,
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
    totalItems,
    label
}: IToolbarProps): JSX.Element {
    return (
        <div className={cn('toolbar', position ?? '')}>
            {activeControls.map((controls, idx): JSX.Element | null => {
                switch (controls) {
                    case 'limit':
                        return (
                            <PageLimitSelector
                                key={`${idx}-${controls}`}
                                uiBlocked={uiBlocked}
                                options={limitOptions}
                                limit={limit}
                                setLimit={setLimit}
                                page={page}
                                setPage={setPage}
                                totalItems={totalItems}
                            />
                        );

                    case 'sort':
                        return (
                            <SortingControls
                                key={`${idx}-${controls}`}
                                uiBlocked={uiBlocked}
                                options={sortOptions}
                                sort={sort}
                                setSort={setSort}
                            />
                        );

                    case 'search':
                        return (
                            <SearchControls
                                key={`${idx}-${controls}`}
                                placeholder={searchPlaceholder}
                                uiBlocked={uiBlocked}
                                search={search}
                                setSearch={setSearch}
                            />
                        );

                    case 'filter':
                        return (
                            <FilterControls
                                key={`${idx}-${controls}`}
                                uiBlocked={uiBlocked}
                                options={filterOptions}
                                filter={filter}
                                setFilter={setFilter}
                            />
                        );

                    case 'pages':
                        return (
                            <PaginationPages
                                key={`${idx}-${controls}`}
                                uiBlocked={uiBlocked}
                                initDataReady={initDataReady}
                                currentPage={page}
                                totalItems={totalItems}
                                limit={limit}
                                setPage={setPage}
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
