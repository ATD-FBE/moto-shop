import { useState, useRef, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch, useAppLocation } from '@/hooks/storeHooks.js';
import Categories from './catalog/Categories.jsx';
import Products from './catalog/Products.jsx';
import {
    getInitFilterParams,
    getInitSortParam,
    getInitPageParam,
    getInitLimitParam,
    getInitCategoryParams
} from '@/helpers/urlParamsHelper.js';
import { productCatalogFilterOptions } from '@shared/filterOptions.js';
import { productsSortOptions } from '@shared/sortOptions.js';
import { productsPageLimitOptions } from '@shared/pageLimitOptions.js';
import { sendCategoryListRequest } from '@/api/categoryRequests.js';
import { sendProductListRequest } from '@/api/productRequests.js';
import { buildCategoryTreeAndMap } from '@/helpers/categoryHelpers.js';
import { reconcileCartWithProducts } from '@/services/cartService.js';
import { logRequestStatus } from '@/helpers/requestLogger.js';
import { DATA_LOAD_STATUS } from '@/config/constants.js';
import { PRODUCTS_PAGE_CONTEXT, REQUEST_STATUS } from '@shared/constants.js';
import type { JSX } from 'react';
import type { TFilterParamsClient, ICategory, IProduct } from '@shared/types/index.js';

export default function Catalog(): JSX.Element {
    const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

    const [initialized, setInitialized] = useState(false);

    const [search, setSearch] = useState('');
    const [filter, setFilter] = useState<TFilterParamsClient>({});
    const [sort, setSort] = useState<string>(productsSortOptions[0].dbField);
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState<number>(productsPageLimitOptions[0]);

    const [initCategoriesReady, setInitCategoriesReady] = useState(false);
    const [categoriesLoading, setCategoriesLoading] = useState(true);
    const [categoriesLoadError, setCategoriesLoadError] = useState(false);
    const [flatCategoryList, setFlatCategoryList] = useState<ICategory[]>([]);
    const [selectedCategoryId, setSelectedCategoryId] = useState('');

    const [initProductsReady, setInitProductsReady] = useState(false);
    const [productsLoading, setProductsLoading] = useState(true);
    const [productsLoadError, setProductsLoadError] = useState(false);
    const [totalProducts, setTotalProducts] = useState(0);
    const [paginatedProductList, setPaginatedProductList] = useState<IProduct[]>([]);

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
        productsLoading
            ? DATA_LOAD_STATUS.LOADING
            : productsLoadError
                ? DATA_LOAD_STATUS.ERROR
                : !totalProducts
                    ? DATA_LOAD_STATUS.NOT_FOUND
                    : DATA_LOAD_STATUS.READY;

    const isProductUiBlocked = categoriesLoadError || productsLoading || productsLoadError;

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
            sendProductListRequest(isAuthenticated, PRODUCTS_PAGE_CONTEXT.CATALOG, urlParams)
        );
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        logRequestStatus({ context: 'PRODUCT: LOAD LIST', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            setProductsLoadError(true);
        } else {
            const { productsCount, paginatedProductList } = responseData;

            setTotalProducts(productsCount ?? 0);
            setPaginatedProductList(paginatedProductList);
            setInitProductsReady(true);
            dispatch(reconcileCartWithProducts(paginatedProductList));
        }
        
        setProductsLoading(false);
    };

    const reloadProducts = (): void => {
        const urlParams = location.search.slice(1);
        loadProducts(urlParams);
    };

    // Стартовая загрузка списка категорий и очистка при размонтировании
    useEffect(() => {
        loadCategories();

        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    // Установка начальных значений параметров компонента после загрузки категорий
    useEffect(() => {
        if (initialized || !initCategoriesReady) return;
    
        const params = new URLSearchParams(location.search);

        setSelectedCategoryId(getInitCategoryParams(params, categoryMap));
        setSearch(params.get('search') || '');
        setFilter(getInitFilterParams(params, productCatalogFilterOptions));
        setSort(getInitSortParam(params, productsSortOptions));
        setPage(getInitPageParam(params));
        setLimit(getInitLimitParam(params, productsPageLimitOptions));

        setInitialized(true);
    }, [initCategoriesReady, categoryMap]);

    // Обновление URL и загрузка товаров с обновлёнными параметрами
    useEffect(() => {
        if (!initialized) return;

        const categoryParam = selectedCategoryId && categoryMap[selectedCategoryId]
            ? `${categoryMap[selectedCategoryId].slug}~${selectedCategoryId}`
            : '';
            
        const params = new URLSearchParams({
            category: categoryParam,
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

        loadProducts(urlParams);
    }, [initialized, selectedCategoryId, search, filter, sort, page, limit]);

    return (
        <div className="catalog-page">
            <header className="catalog-header">
                <h2>Каталог товаров магазина</h2>
            </header>

            <div className="catalog-main">
                <Categories
                    categoryTree={categoryTree}
                    selectedCategoryId={selectedCategoryId}
                    setSelectedCategoryId={setSelectedCategoryId}
                    loadStatus={categoriesLoadStatus}
                    reloadCategories={loadCategories}
                />

                {initialized && (
                    <Products
                        loadStatus={productsLoadStatus}
                        reloadProducts={reloadProducts}
                        products={paginatedProductList}
                        search={search}
                        setSearch={setSearch}
                        filter={filter}
                        setFilter={setFilter}
                        filterOptions={productCatalogFilterOptions}
                        sort={sort}
                        setSort={setSort}
                        sortOptions={productsSortOptions}
                        page={page}
                        setPage={setPage}
                        limit={limit}
                        setLimit={setLimit}
                        limitOptions={productsPageLimitOptions}
                        initDataReady={initProductsReady}
                        totalProducts={totalProducts}
                        uiBlocked={isProductUiBlocked}
                    />
                )}
            </div>
        </div>
    );
}
