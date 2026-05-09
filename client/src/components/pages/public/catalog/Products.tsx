import { useState, useRef, useEffect } from 'react';
import cn from 'classnames';
import { useAppSelector } from '@/hooks/storeHooks.js';
import Toolbar from '@/components/common/Toolbar.jsx';
import TrackedImage from '@/components/common/TrackedImage.jsx';
import BlockableLink from '@/components/common/BlockableLink.jsx';
import ProductQuantitySelector from '@/components/common/ProductQuantitySelector.jsx';
import ZoomController from '@/components/common/ZoomController.jsx';
import { routeConfig } from '@/config/appRouting.js';
import { formatProductTitle, formatCurrency } from '@/helpers/textHelpers.js';
import generateSlug from '@/helpers/generateSlug.js';
import {
    LOAD_STATUS_MIN_HEIGHT,
    DATA_LOAD_STATUS,
    PRODUCT_IMAGE_PLACEHOLDER
} from '@/config/constants.js';
import { USER_ROLE } from '@shared/constants.js';
import type { JSX, Dispatch, SetStateAction } from 'react';
import type { TDataLoadStatus } from '@/types/index.js';
import type {
    IProduct,
    TFilterParamsClient,
    TFilterOption,
    ISortOption,
    TUserRole
} from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IProductsProps {
    loadStatus: TDataLoadStatus;
    reloadProducts: () => void;
    products: IProduct[];
    search: string;
    setSearch: Dispatch<SetStateAction<string>>;
    filter: TFilterParamsClient;
    setFilter: Dispatch<SetStateAction<TFilterParamsClient>>;
    filterOptions?: readonly TFilterOption[];
    sort: string;
    setSort: Dispatch<SetStateAction<string>>;
    sortOptions: readonly ISortOption[];
    page: number;
    setPage: Dispatch<SetStateAction<number>>;
    limit: number;
    setLimit: Dispatch<SetStateAction<number>>;
    limitOptions: readonly number[];
    initDataReady: boolean;
    totalProducts: number;
    uiBlocked: boolean;
}

type TProductsMainProps = Pick<IProductsProps,
    | 'loadStatus'
    | 'reloadProducts'
    | 'products'
    | 'uiBlocked'
> & {
    isTouchDevice: boolean;
    isAuthenticated: boolean;
    userRole: Exclude<TUserRole, typeof USER_ROLE.SYSTEM>;
    customerDiscount: number;
};

type TProductCardProps = Pick<TProductsMainProps,
    | 'isTouchDevice'
    | 'isAuthenticated'
    | 'userRole'
    | 'customerDiscount'
    | 'uiBlocked'
> & {
    product: IProduct;
};

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function Products({
    loadStatus,
    reloadProducts,
    products,
    search,
    setSearch,
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
    totalProducts,
    uiBlocked
}: IProductsProps): JSX.Element {
    const isTouchDevice = useAppSelector(state => state.ui.isTouchDevice);
    const { isAuthenticated, user } = useAppSelector(state => state.auth);

    const userRole = user?.role ?? USER_ROLE.GUEST;
    const customerDiscount = user?.discount ?? 0;

    return (
        <div className="products">
            <header className="products-header">
                <h3>Товары магазина</h3>
            </header>

            <Toolbar
                position="top"
                activeControls={['limit', 'sort', 'search', 'filter', 'pages']}
                search={search}
                setSearch={setSearch}
                searchPlaceholder="По артикулу, наименованию, бренду или тегам товара"
                filter={filter}
                setFilter={setFilter}
                filterOptions={filterOptions}
                sort={sort}
                setSort={setSort}
                sortOptions={sortOptions}
                page={page}
                setPage={setPage}
                limit={limit}
                setLimit={setLimit}
                limitOptions={limitOptions}
                initDataReady={initDataReady}
                totalItems={totalProducts}
                uiBlocked={uiBlocked}
            />

            <ProductsMain
                loadStatus={loadStatus}
                reloadProducts={reloadProducts}
                products={products}
                isTouchDevice={isTouchDevice}
                isAuthenticated={isAuthenticated}
                userRole={userRole}
                customerDiscount={customerDiscount}
                uiBlocked={uiBlocked}
            />

            <Toolbar
                position="bottom"
                activeControls={['info', 'pages']}
                page={page}
                setPage={setPage}
                limit={limit}
                loadStatus={loadStatus}
                initDataReady={initDataReady}
                totalItems={totalProducts}
                label="Товары"
                uiBlocked={uiBlocked}
            />
        </div>
    );
}

function ProductsMain({
    loadStatus,
    reloadProducts,
    products,
    isTouchDevice,
    isAuthenticated,
    userRole,
    customerDiscount,
    uiBlocked
}: TProductsMainProps): JSX.Element {
    const [productsMainHeight, setProductsMainHeight] = useState(LOAD_STATUS_MIN_HEIGHT);
    const productsMainRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
        if (!productsMainRef.current) return;
        
        const newHeight = productsMainRef.current.offsetHeight;
        if (newHeight !== productsMainHeight) setProductsMainHeight(newHeight);
    }, [loadStatus]);

    if (loadStatus === DATA_LOAD_STATUS.LOADING) {
        return (
            <div
                className="products-main"
                style={{ height: Math.max(LOAD_STATUS_MIN_HEIGHT, productsMainHeight) }}
            >
                <div className="products-load-status">
                    <p>
                        <span className="icon load">⏳</span>
                        Загрузка товаров...
                    </p>
                </div>
            </div>
        );
    }

    if (loadStatus === DATA_LOAD_STATUS.ERROR) {
        return (
            <div
                ref={productsMainRef}
                className="products-main"
                style={{ height: LOAD_STATUS_MIN_HEIGHT }}
            >
                <div className="products-load-status">
                    <p>
                        <span className="icon error">❌</span>
                        Ошибка сервера. Товары не доступны.
                    </p>
                    <button className="reload-btn" onClick={reloadProducts}>Повторить</button>
                </div>
            </div>
        );
    }

    if (loadStatus === DATA_LOAD_STATUS.NOT_FOUND) {
        return (
            <div
                ref={productsMainRef}
                className="products-main"
                style={{ height: LOAD_STATUS_MIN_HEIGHT }}
            >
                <div className="products-load-status">
                    <p>
                        <span className="icon not-found">🔎</span>
                        Товары не найдены.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div ref={productsMainRef} className="products-main">
            <ul className="product-list">
                {products.map(prod => (
                    <li key={prod.id} className="product-item">
                        <ProductCard
                            product={prod}
                            isTouchDevice={isTouchDevice}
                            isAuthenticated={isAuthenticated}
                            userRole={userRole}
                            customerDiscount={customerDiscount}
                            uiBlocked={uiBlocked}
                        />
                    </li>
                ))}
            </ul>
        </div>
    );
}

function ProductCard({
    product,
    isTouchDevice,
    isAuthenticated,
    userRole,
    customerDiscount,
    uiBlocked
}: TProductCardProps): JSX.Element {
    const {
        id, images, mainImageIndex, sku, name, brand, available,
        isBrandNew, isRestocked, unit, price, discount: productDiscount, isActive
    } = product;
    
    const cartItem = useAppSelector(state => state.cart.byId[id]);
    const isCartAccessible = useAppSelector(state => state.cart.isAccessible);

    const [thumbElem, setThumbElem] = useState<HTMLDivElement | null>(null);
    const [thumbImageElem, setThumbImageElem] = useState<HTMLImageElement | null>(null);

    const showCartControls =
        [USER_ROLE.GUEST, USER_ROLE.CUSTOMER].some(role => role === userRole) &&
        isCartAccessible &&
        available > 0 &&
        isActive;

    const quantity = cartItem?.quantity ?? 0;
    const quantityReduced = cartItem?.quantityReduced ?? false;

    const title = formatProductTitle(name, brand);
    const slug = generateSlug(title);
    const productUrl = routeConfig.productDetails.generatePath({ slug, sku, productId: id });

    const hasImages = images.length > 0;
    const mainImage = hasImages ? images[mainImageIndex ?? 0] ?? images[0] : null;
    const thumbImageSrc = mainImage?.thumbnails.medium ?? PRODUCT_IMAGE_PLACEHOLDER;
    const thumbImageAlt = hasImages ? title : '';

    const effectiveDiscount = Math.max(productDiscount, customerDiscount);
    const hasDiscount = effectiveDiscount > 0;
    const currentPrice = hasDiscount ? price * (1 - effectiveDiscount / 100) : price;

    const formattedOriginalPrice = formatCurrency(price);
    const formattedCurrentPrice = formatCurrency(currentPrice);

    return (
        <article data-id={id} className="product-card">
            <div ref={setThumbElem} className="product-thumb">
                <BlockableLink to={productUrl}>
                    <TrackedImage
                        ref={setThumbImageElem}
                        className="product-thumb-img"
                        src={thumbImageSrc}
                        alt={thumbImageAlt}
                    />
                    {hasImages && mainImage && thumbElem && thumbImageElem && (
                        <ZoomController
                            zoomAnchorElem={thumbElem}
                            thumbImageElem={thumbImageElem}
                            originalImageSrc={mainImage.original}
                            zoomFactor={0.6}
                        />
                    )}
                </BlockableLink>
            </div>

            <div className="product-title">
                {/* Визуальный слой */}
                <div className="product-title-visual">
                    {isBrandNew && (
                        <p className="badge"><span className="brand-new">Новинка!</span></p>
                    )}
                    <p className="title">{title}</p>
                </div>

                {/* Интерактивный слой */}
                <BlockableLink to={productUrl}>
                    {isBrandNew && (
                        <p className="badge"><span className="brand-new">Новинка!</span></p>
                    )}
                    <p className="title">{title}</p>
                </BlockableLink>
            </div>

            <div className="product-prices">
                {hasDiscount && isActive && (
                    <p className="discount-info">
                        <span className="original-price">{formattedOriginalPrice} руб./{unit}</span>
                        <span className="discount">-{effectiveDiscount}%</span>
                    </p>
                )}
                
                <p className="current-price">
                    {isActive ? formattedCurrentPrice : formattedOriginalPrice}
                    <span className="price-unit"> руб./{unit}</span>
                </p>
            </div>

            <div className="product-info">
                {isActive ? (
                    <div className={cn('product-available', { 'out-of-stock': !available })}>
                        <p>
                            <span className="icon">{available > 0 ? '✔' : '❌'}</span>
                            {available > 0 ? `В наличии (${available})` : 'Нет в наличии'}
                        </p>
                        {isRestocked && <p className="restock"> → поступление</p>}
                    </div>
                ) : (
                    <div className="product-inactive">
                        <span className="icon">🔒</span>
                        Не продаётся
                    </div>
                )}
                
                <div className="product-sku">
                    {sku}
                </div>
            </div>

            {showCartControls && (
                <ProductQuantitySelector
                    productId={id}
                    availableQuantity={available}
                    orderedQuantity={quantity}
                    quantityReduced={quantityReduced}
                    isTouchDevice={isTouchDevice}
                    isAuthenticated={isAuthenticated}
                    uiBlocked={uiBlocked}
                />
            )}
        </article>
    );
}
