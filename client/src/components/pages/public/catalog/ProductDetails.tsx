import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAppSelector, useAppDispatch, useAppLocation } from '@/hooks/storeHooks.js';
import ProductImageGallery from './product-details/ProductImageGallery.jsx';
import ProductInfo from './product-details/ProductInfo.jsx';
import { sendProductRequest } from '@/api/productRequests.js';
import { routeConfig } from '@/config/appRouting.js';
import { parseRouteParams } from '@/helpers/routeHelpers.js';
import { logRequestStatus } from '@/helpers/logHelpers.js';
import { formatProductTitle } from '@/helpers/textHelpers.js';
import generateSlug from '@/helpers/generateSlug.js';
import { reconcileCartWithProducts } from '@/services/cartService.js';
import { DATA_LOAD_STATUS, NO_VALUE_LABEL } from '@/config/constants.js';
import { USER_ROLE, REQUEST_STATUS } from '@shared/constants.js';
import type { JSX } from 'react';
import type { IProduct } from '@shared/types/index.js';

export default function ProductDetails(): JSX.Element {
    const isTouchDevice = useAppSelector(state => state.ui.isTouchDevice);

    const { isAuthenticated, user } = useAppSelector(state => state.auth);
    const userRole = user?.role ?? USER_ROLE.GUEST;

    const [productLoading, setProductLoading] = useState(true);
    const [productLoadError, setProductLoadError] = useState(false);
    const [product, setProduct] = useState<IProduct | null>(null);

    const isUnmountedRef = useRef(false);

    const dispatch = useAppDispatch();
    const location = useAppLocation();
    const navigate = useNavigate();

    const { sku, productId } = parseRouteParams({
        routeKey: 'productDetails',
        params: useParams()
    });

    const productLoadStatus =
        productLoading
            ? DATA_LOAD_STATUS.LOADING
            : productLoadError
                ? DATA_LOAD_STATUS.ERROR
                : DATA_LOAD_STATUS.READY;
       
    const {
        images, mainImageIndex, name, brand, description, available,
        isBrandNew, isRestocked, unit, price, discount: productDiscount, isActive
    } = product ?? {};

    const title = formatProductTitle(name, brand);

    const loadProduct = async (): Promise<void> => {
        if (!productId) {
            setProductLoading(false);
            setProductLoadError(true);
            return;
        }

        setProductLoadError(false);
        setProductLoading(true);

        const responseData = await dispatch(sendProductRequest(isAuthenticated, productId));
        if (isUnmountedRef.current) return;

        const { status, message } = responseData;
        logRequestStatus({ context: 'PRODUCT: LOAD SINGLE', status, message });

        if (status !== REQUEST_STATUS.SUCCESS) {
            setProductLoadError(true);
        } else {
            const { product } = responseData;

            setProduct(product);
            dispatch(reconcileCartWithProducts([product]));

            const { id, sku, name, brand } = product;
            const title = formatProductTitle(name, brand);
            const slug = generateSlug(title);
            const updatedUrl = routeConfig.productDetails.generatePath({ productId: id, slug, sku });

            if (location.pathname !== updatedUrl) {
                navigate(updatedUrl, { replace: true });
            }
        }

        setProductLoading(false);
    };

    // Стартовая загрузка товара и очистка при размонтировании
    useEffect(() => {
        loadProduct();

        return () => {
            isUnmountedRef.current = true;
        };
    }, []);

    return (
        <div className="product-details-page">
            <header className="product-details-header">
                <h2>
                    {product
                        ? <>{title}{isBrandNew && <span className="brand-new">Новинка!</span>}</>
                        : NO_VALUE_LABEL}
                </h2>
            </header>

            <div className="product-details-main">
                <ProductImageGallery
                    loadStatus={productLoadStatus}
                    images={images ?? []}
                    mainImageIndex={mainImageIndex ?? 0}
                    title={title}
                    reloadData={loadProduct}
                />

                <ProductInfo
                    id={productId}
                    sku={sku ?? NO_VALUE_LABEL}
                    name={name ?? NO_VALUE_LABEL}
                    brand={brand ?? NO_VALUE_LABEL}
                    description={description ?? NO_VALUE_LABEL}
                    available={available ?? 0}
                    unit={unit ?? NO_VALUE_LABEL}
                    price={price ?? 0}
                    productDiscount={productDiscount ?? 0}
                    customerDiscount={user?.discount ?? 0}
                    isRestocked={isRestocked ?? false}
                    isActive={isActive ?? false}
                    isTouchDevice={isTouchDevice}
                    isAuthenticated={isAuthenticated}
                    userRole={userRole}
                    uiBlocked={productLoadStatus !== DATA_LOAD_STATUS.READY}
                />
            </div>
        </div>
    );
}
