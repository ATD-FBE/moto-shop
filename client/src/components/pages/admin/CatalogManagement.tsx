import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch, useAppLocation } from '@/hooks/storeHooks.js';
import CategoryEditor from './catalog-management/CategoryEditor.jsx';
import ProductEditor from './catalog-management/ProductEditor.jsx';
import { sendCategoryListRequest } from '@/api/categoryRequests.js';
import { sendProductListRequest } from '@/api/productRequests.js';
import { upsertProductsInStore } from '@/redux/slices/productsSlice.js';
import {
    getInitFilterParams,
    getInitSortParam,
    getInitPageParam,
    getInitLimitParam,
    getInitCategoryParams
} from '@/helpers/urlParamsHelper.js';
import { buildCategoryTreeAndMap } from '@/helpers/categoryHelpers.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { DATA_LOAD_STATUS } from '@/config/constants.js';
import { productEditorFilterOptions } from '@shared/filterOptions.js';
import { productEditorSortOptions } from '@shared/sortOptions.js';
import { productEditorPageLimitOptions } from '@shared/pageLimitOptions.js';
import { trimSetByFilter } from '@shared/commonHelpers.js';
import { PRODUCTS_PAGE_CONTEXT, REQUEST_STATUS } from '@shared/constants.js';
import type { JSX } from 'react';
import type { TFilterParamsClient, ICategory, IProduct } from '@shared/types/index.js';

export default function CatalogManagement(): JSX.Element {
    const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

    const [initialized, setInitialized] = useState(false);

    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<TFilterParamsClient>({});
    const [sort, setSort] = useState<string>(productEditorSortOptions[0].dbField);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState<number>(productEditorPageLimitOptions[0]);

    const [initCategoriesReady, setInitCategoriesReady] = useState(false);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [categoriesLoadError, setCategoriesLoadError] = useState(false);
    const [categoryOperationBusy, setCategoryOperationBusy] = useState(false);
    const [flatCategoryList, setFlatCategoryList] = useState<ICategory[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');

    const [initProductsReady, setInitProductsReady] = useState(false);
    const [shouldProductsLoad, setShouldProductsLoad] = useState(false);
    const [productsLoading, setProductsLoading] = useState(false);
    const [productsLoadError, setProductsLoadError] = useState(false);
    const [productOperationBusy, setProductOperationBusy] = useState(false);
    const [paginatedProductList, setPaginatedProductList] = useState<IProduct[]>([]);
    const [filteredProductIds, setFilteredProductIds] = useState<Set<string>>(new Set());
    const [selectedProductIds, setSelectedProductIds] = useState<Set<string>>(new Set());
    const [expandedProductIds, setExpandedProductIds] = useState<Set<string>>(new Set());

    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();
    const location = useAppLocation();
    const navigate = useNavigate();

    const { categoryTree, categoryMap } = useMemo(
        () => buildCategoryTreeAndMap(flatCategoryList),
        [flatCategoryList] 
    );

    const categoriesLoadStatus =
        categoriesLoading
            ? DATA_LOAD_STATUS.LOADING
            : categoriesLoadError
                ? DATA_LOAD_STATUS.ERROR
                : DATA_LOAD_STATUS.READY;
    
    const productsLoadStatus =
        !shouldProductsLoad
            ? DATA_LOAD_STATUS.SKIPPED
            : productsLoading
                ? DATA_LOAD_STATUS.LOADING
                : productsLoadError
                    ? DATA_LOAD_STATUS.ERROR
                    : !filteredProductIds.size
                        ? DATA_LOAD_STATUS.NOT_FOUND
                        : DATA_LOAD_STATUS.READY;

    const isCategoryUiBlocked =
        categoriesLoading ||
        categoriesLoadError ||
        categoryOperationBusy ||
        productOperationBusy;

    const isProductUiBlocked =
        productsLoading ||
        productsLoadError ||
        productOperationBusy ||
        categoryOperationBusy;

    const loadCategories = async (): Promise<void> => {
        setCategoriesLoadError(false);
        setCategoriesLoading(true);

        const responseData = await dispatch(sendCategoryListRequest());
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        logRequestStatus({ context: 'CATEGORY: LOAD LIST', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            setCategoriesLoadError(true);
        } else {
            setFlatCategoryList(responseData.categoryList);
            setInitCategoriesReady(true);
        }

        setCategoriesLoading(false);
    };

    const loadProducts = async (urlParams: string): Promise<void> => {
        setProductsLoadError(false);
        setProductsLoading(true);

        const responseData = await dispatch(
            sendProductListRequest(isAuthenticated, PRODUCTS_PAGE_CONTEXT.EDITOR, urlParams)
        );
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        logRequestStatus({ context: 'PRODUCT: LOAD LIST', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            unloadProducts();
            setProductsLoadError(true);
        } else {
            const { filteredProductIdList, paginatedProductList } = responseData;

            setFilteredProductIds(new Set(filteredProductIdList ?? []));
            setPaginatedProductList(paginatedProductList);
            setInitProductsReady(true);
            dispatch(upsertProductsInStore(paginatedProductList));
        }
        
        setProductsLoading(false);
    };

    const reloadProducts = async (): Promise<void> => {
        const urlParams = location.search.slice(1);
        const fetchParams = new URLSearchParams(urlParams);
        fetchParams.delete('products');

        await loadProducts(fetchParams.toString());
    };

    const unloadProducts = ({ resetPage }: { resetPage?: boolean } = {}): void => {
        setFilteredProductIds(new Set());
        setPaginatedProductList([]);
        if (resetPage) setPage(1);
    };

    const toggleAllProductSelection = (areAllProductsSelected: boolean): void => {
        if (!filteredProductIds.size) return;
        setSelectedProductIds(new Set(areAllProductsSelected ? [] : filteredProductIds));
    };

    const toggleProductSelection = (id: string): void => {
        setSelectedProductIds(prev => {
            const newSelection = new Set(prev);

            if (newSelection.has(id)) {
                newSelection.delete(id);
            } else {
                newSelection.add(id);
            }
    
            return newSelection;
        });
    };

    const toggleProductExpansion = (id: string): void => {
        setExpandedProductIds(prev => {
            const newExpandedSet = new Set(prev);

            if (newExpandedSet.has(id)) {
                newExpandedSet.delete(id);
            } else {
                newExpandedSet.add(id);
            }

            return newExpandedSet;
        });
    };

    // Стартовая загрузка списка категорий и очистка при размонтировании
    useEffect(() => {
        loadCategories();

        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Установка начальных значений параметров после первой загрузки категорий
    useEffect(() => {
        if (initialized || !initCategoriesReady) return;
    
        const params = new URLSearchParams(location.search);
        const hasProducts = params.get('products') === 'true';

        setSelectedCategoryId(getInitCategoryParams(params, categoryMap));
        setSearch(params.get('search') || '');
        setFilter(getInitFilterParams(params, productEditorFilterOptions));
        setSort(getInitSortParam(params, productEditorSortOptions));
        setPage(getInitPageParam(params));
        setLimit(getInitLimitParam(params, productEditorPageLimitOptions));

        setShouldProductsLoad(hasProducts);
        if (hasProducts) setProductsLoading(true);
        setInitialized(true);
    }, [initCategoriesReady, categoryMap]);

    // Обновление параметров в URL и загрузка/выгрузка товаров
    useEffect(() => {
        if (!initialized) return;

        const categoryParam = selectedCategoryId && categoryMap[selectedCategoryId]
            ? `${categoryMap[selectedCategoryId].slug}~${selectedCategoryId}`
            : '';

        const params = new URLSearchParams({
            category: categoryParam,
            products: String(shouldProductsLoad),
            search,
            sort,
            page: String(page),
            limit: String(limit),
            ...filter
        });
        const urlParams = params.toString();

        if (location.search !== `?${urlParams}`) {
            const newUrl = `${location.pathname}?${urlParams}`;
            navigate(newUrl, { replace: true });
        }

        if (shouldProductsLoad) {
            const fetchParams = new URLSearchParams(params);
            fetchParams.delete('products');
            loadProducts(fetchParams.toString());
        } else {
            unloadProducts({ resetPage: true });
        }
    }, [
        initialized,
        categoryMap,
        selectedCategoryId,
        shouldProductsLoad,
        search,
        filter,
        sort,
        page,
        limit
    ]);

    // Удаление отсутствующих в загруженной выборке товаров из выбранных и раскрытых ранее
    useEffect(() => {
        const [trimmedSelected, selectedChanged] =
            trimSetByFilter(selectedProductIds, filteredProductIds);
        const [trimmedExpanded, expandedChanged] =
            trimSetByFilter(expandedProductIds, filteredProductIds);
    
        if (selectedChanged) setSelectedProductIds(trimmedSelected);
        if (expandedChanged) setExpandedProductIds(trimmedExpanded);
    }, [filteredProductIds]);
    
    return (
        <div className="catalog-management-page">
            <header className="catalog-management-header">
                <h2>Управление каталогом магазина</h2>
                <p>Создание, редактирование и удаление категорий и товаров</p>
            </header>

            <CategoryEditor
                setOperationBusy={setCategoryOperationBusy}
                categoryMap={categoryMap}
                categoryTree={categoryTree}
                selectedCategoryId={selectedCategoryId}
                setSelectedCategoryId={setSelectedCategoryId}
                loadStatus={categoriesLoadStatus}
                loadCategories={loadCategories}
                shouldProductsLoad={shouldProductsLoad}
                setShouldProductsLoad={setShouldProductsLoad}
                uiBlocked={isCategoryUiBlocked}
            />

            {initialized && (
                <ProductEditor
                    categoryTree={categoryTree}
                    setOperationBusy={setProductOperationBusy}
                    shouldProductsLoad={shouldProductsLoad}
                    search={search}
                    setSearch={setSearch}
                    filter={filter}
                    setFilter={setFilter}
                    filterOptions={productEditorFilterOptions}
                    sort={sort}
                    setSort={setSort}
                    sortOptions={productEditorSortOptions}
                    page={page}
                    setPage={setPage}
                    limit={limit}
                    setLimit={setLimit}
                    limitOptions={productEditorPageLimitOptions}
                    initDataReady={initProductsReady}
                    loadStatus={productsLoadStatus}
                    onReload={reloadProducts}
                    products={paginatedProductList}
                    filteredIds={filteredProductIds}
                    selectedIds={selectedProductIds}
                    expandedIds={expandedProductIds}
                    onToggleAllSelection={toggleAllProductSelection}
                    onToggleSelection={toggleProductSelection}
                    onToggleExpansion={toggleProductExpansion}
                    uiBlocked={isProductUiBlocked}
                />
            )}
        </div>
    );
}
