import { jest } from '@jest/globals';
import { userEvent } from '@testing-library/user-event';
import { render, screen, waitFor } from '@testing-library/react';
import { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import uiReducer from '@/redux/slices/uiSlice.js';
import authReducer from '@/redux/slices/authSlice.js';
import cartReducer, {
    defaultCartItemExtendedParams as defCartItemExtParams
} from '@/redux/slices/cartSlice.js';
import productsReducer from '@/redux/slices/productsSlice.js';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { DATA_LOAD_STATUS, SCREEN_SIZE } from '@/config/constants.js';
import { USER_ROLE, MIN_ORDER_AMOUNT, REQUEST_STATUS } from '@shared/constants.js';
import type {
    IUser,
    ICartItem,
    IProduct,
    TProductSnapshot
} from '@shared/types/index.js';

jest.unstable_mockModule('@/services/modalAlertService.js', () => ({
    openAlertModal: jest.fn(),
}));
jest.unstable_mockModule('@/services/modalConfirmService.js', () => ({
    openConfirmModal: jest.fn(),
}));

const { default: Cart } = await import('@/components/pages/customer/Cart.jsx');
const { openAlertModal } = await import('@/services/modalAlertService.js');
const { openConfirmModal } = await import('@/services/modalConfirmService.js');

const CUSTOMER_BASE: IUser = {
    name: 'Tested Customer',
    email: 'test-customer@motoshop.ru',
    role: USER_ROLE.CUSTOMER,
    discount: 0
};

const PROD_1_ID = 'moto-prod-1';
const PROD_2_ID = 'moto-prod-2';

const PROD_1_BASE: IProduct = {
    _type: 'full',
    id: PROD_1_ID,
    images: [],
    name: 'Шлем интеграл',
    available: 5,
    isBrandNew: false,
    isRestocked: false,
    unit: 'шт.',
    price: 20000,
    discount: 15,
    isActive: true
};
const PROD_2_BASE: IProduct = {
    _type: 'full',
    id: PROD_2_ID,
    images: [],
    name: 'Зеркала овальные',
    available: 20,
    isBrandNew: false,
    isRestocked: false,
    unit: 'пар.',
    price: 1000,
    discount: 0,
    isActive: true
};

const CART_ITEM_1_BASE: ICartItem = { ...defCartItemExtParams, id: PROD_1_ID, quantity: 2 };
const CART_ITEM_2_BASE: ICartItem = { ...defCartItemExtParams, id: PROD_2_ID, quantity: 5 };

const CART_ITEM_LIST_RESPONSE_BASE = {
    message: 'Корзина успешно загружена',
    tradeProductList: [PROD_1_BASE, PROD_2_BASE],
    cartItemList: [CART_ITEM_1_BASE, CART_ITEM_2_BASE],
    customerDiscount: 10
};

// rawTotal: 2 * 20000 + 5 * 1000 = 40000 + 5000 = 45000
// discountedTotal: 2 * (20000 - 15%) + 5 * (1000 - 10%) = 34000 + 4500 = 38500

const server = setupServer(
    http.get('/api/cart', () => {
        return HttpResponse.json(CART_ITEM_LIST_RESPONSE_BASE, { status: 200 });
    })
);

function renderWithProviders(uiElement: ReactElement) {
    const defaultAuthState = authReducer(undefined, { type: '@@INIT' });
    const defaultCartState = cartReducer(undefined, { type: '@@INIT' });
    const defaultProductsState = productsReducer(undefined, { type: '@@INIT' });
    const defaultUiState = uiReducer(undefined, { type: '@@INIT' });

    const store = configureStore({
        reducer: {
            auth: authReducer,
            cart: cartReducer,
            products: productsReducer,
            ui: uiReducer
        },
        preloadedState: {
            auth: {
                ...defaultAuthState,
                isAuthenticated: true,
                user: CUSTOMER_BASE
            },
            ui: {
                ...defaultUiState,
                isTouchDevice: false,
                screenSize: SCREEN_SIZE.LARGE,
                isDashboardPanelActive: true
            },
            cart: defaultCartState,
            products: defaultProductsState
        }
    });

    return render(
        <Provider store={store}>
            <MemoryRouter>
                {uiElement}
            </MemoryRouter>
        </Provider>
    );
}

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('Integration Tests MSW - Компонент Cart', () => {
    it('загружает данные корзины из MSW и рендерит их', async () => {
        renderWithProviders(<Cart />);

        // Проверка данных на странице до загрузки корзины
        const prodCounterP = screen.getByTestId('prod-counter');

        expect(screen.getByText('Корзина покупателя')).toBeInTheDocument();
        expect(prodCounterP).toHaveTextContent('В корзине 0 товарных позиций');
        expect(screen.getByText(/загрузка товаров корзины/i)).toBeInTheDocument();

        expect(screen.queryByTestId('cart-original-total')).toBeNull();
        expect(screen.getByTestId('cart-current-total')).toHaveTextContent('0,00 руб.');
        expect(screen.queryByTestId('cart-saved-total')).toBeNull();

        // Ожидание загрузки данных в корзине и проверка их наличия на странице после
        await waitFor(() => {
            expect(prodCounterP).toHaveTextContent('В корзине 2 товарные позиции');

            // Сумма без скидки: 2 * 20000 + 5 * 1000 = 40000 + 5000 = 45000
            expect(screen.queryByTestId('cart-original-total')).toHaveTextContent('45 000,00 руб.');

            // Сумма со скидкой: 2 * (20000 - 15%) + 5 * (1000 - 10%) = 34000 + 4500 = 38500
            expect(screen.getByTestId('cart-current-total')).toHaveTextContent('38 500,00 руб.');

            // Скидка: 45000 - 38500 = 6500
            expect(screen.queryByTestId('cart-saved-total')).toHaveTextContent('6 500,00 руб.');

            expect(screen.getByRole('link', { name: /шлем интеграл/i })).toBeInTheDocument();
            expect(screen.getByRole('link', { name: /зеркала овальные/i })).toBeInTheDocument();
        });
    });

    it('отображает сообщение об ошибке загрузки данных и позволяет перезагрузить корзину', async () => {
        const user = userEvent.setup();

        server.use(
            http.get('/api/cart', () => {
                return HttpResponse.json({ message: 'Ошибка загрузки корзины' }, { status: 500 });
            })
        );
    
        renderWithProviders(<Cart />);
    
        // Ожидание появления кнопки перезагрузки при ошибке сервера через findByRole (замена waitFor)
        const reloadBtn = await screen.findByRole('button', { name: /повторить/i });
        expect(screen.getByText(/ошибка сервера/i)).toBeInTheDocument();

        // Возвращение MSW к дефолтному (успешному) сценарию
        server.resetHandlers();

        // Клик по кнопке (СТРОГО вне waitFor)
        await user.click(reloadBtn);

        // Проверка данных после успешной загрузки корзины
        await waitFor(() => {
            expect(screen.getByTestId('prod-counter')).toHaveTextContent('В корзине 2 товарные позиции');
            expect(screen.getByRole('link', { name: /шлем интеграл/i })).toBeInTheDocument();
            expect(screen.queryByText(/ошибка сервера/i)).toBeNull();
        });
    });

    it('отображает пустую корзину и позволяет обновить данные до полных', async () => {
        const user = userEvent.setup();

        server.use(
            http.get('/api/cart', () => {
                return HttpResponse.json({
                    ...CART_ITEM_LIST_RESPONSE_BASE,
                    tradeProductList: [],
                    cartItemList: []
                });
            })
        );
    
        renderWithProviders(<Cart />);
    
        const updateCartBtn = screen.getByRole('button', { name: /обновить данные/i });
        expect(updateCartBtn).toBeInTheDocument();
        expect(updateCartBtn).toBeDisabled();

        const emptyMessage = await screen.findByText(/корзина пуста/i);
        expect(emptyMessage).toBeInTheDocument();

        server.resetHandlers();

        expect(updateCartBtn).not.toBeDisabled();
        await user.click(updateCartBtn);

        await waitFor(() => {
            expect(screen.getByTestId('prod-counter')).toHaveTextContent('В корзине 2 товарные позиции');
            expect(screen.getByRole('link', { name: /шлем интеграл/i })).toBeInTheDocument();
            expect(screen.queryByText(/корзина пуста/i)).toBeNull();
        });
    });
});
