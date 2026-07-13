import { userEvent } from '@testing-library/user-event';
import { render, screen, waitFor, act } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { ReactElement } from 'react';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router-dom';
import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/redux/slices/authSlice.js';
import uiReducer from '@/redux/slices/uiSlice.js';
import modalAlertReducer from '@/redux/slices/modalAlertSlice.js';
import modalConfirmReducer from '@/redux/slices/modalConfirmSlice.js';
import cartReducer, {
    defaultCartItemExtendedParams as defCartItemExtParams
} from '@/redux/slices/cartSlice.js';
import productsReducer from '@/redux/slices/productsSlice.js';
import Cart from '@/components/pages/customer/Cart.jsx';
import AlertModal from '@/components/common/AlertModal.jsx';
import ConfirmModal from '@/components/common/ConfirmModal.jsx';
import { getConfirmModalActions, closeConfirmModal } from '@/services/modalConfirmService.js';
import { SCREEN_SIZE } from '@/config/constants.js';
import { assertDefined } from '@shared/commonHelpers.js';
import { USER_ROLE, MIN_ORDER_AMOUNT, REQUEST_STATUS } from '@shared/constants.js';
import type { IUser, ICartItem, IProduct } from '@shared/types/index.js';

const CUSTOMER_MOCK: IUser = {
    name: 'Tested Customer',
    email: 'test-customer@motoshop.ru',
    role: USER_ROLE.CUSTOMER,
    discount: 0
};

const PROD_1_ID = 'moto-prod-1';
const PROD_2_ID = 'moto-prod-2';

const PROD_1_MOCK: IProduct = {
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
const PROD_2_MOCK: IProduct = {
    _type: 'full',
    id: PROD_2_ID,
    images: [],
    sku: 'ZERK-005',
    name: 'Зеркала овальные',
    available: 20,
    isBrandNew: false,
    isRestocked: false,
    unit: 'пар.',
    price: 1000,
    discount: 0,
    isActive: true
};

const CART_ITEM_1_MOCK: ICartItem = { ...defCartItemExtParams, id: PROD_1_ID, quantity: 2 };
const CART_ITEM_2_MOCK: ICartItem = { ...defCartItemExtParams, id: PROD_2_ID, quantity: 5 };

const CART_ITEM_LIST_RESPONSE_MOCK = {
    message: 'Корзина успешно загружена',
    tradeProductList: [PROD_1_MOCK, PROD_2_MOCK],
    cartItemList: [CART_ITEM_1_MOCK, CART_ITEM_2_MOCK],
    customerDiscount: 10
};
const CART_CLEAR_RESPONSE_MOCK = {
    message: 'Корзина успешно очищена'
};

// rawTotal: 2 * 20000 + 5 * 1000 = 40000 + 5000 = 45000
// discountedTotal: 2 * (20000 - 15%) + 5 * (1000 - 10%) = 34000 + 4500 = 38500

const server = setupServer(
    http.get('/api/cart', () => {
        return HttpResponse.json(CART_ITEM_LIST_RESPONSE_MOCK, { status: 200 });
    }),
    http.delete('/api/cart/clear', () => {
        return HttpResponse.json(CART_CLEAR_RESPONSE_MOCK, { status: 200 });
    })
);

function renderWithProviders(uiElement: ReactElement) {
    const defaultAuthState = authReducer(undefined, { type: '@@INIT' });
    const defaultUiState = uiReducer(undefined, { type: '@@INIT' });
    const defaultModalAlertState = modalAlertReducer(undefined, { type: '@@INIT' });
    const defaultModalConfirmState = modalConfirmReducer(undefined, { type: '@@INIT' });
    const defaultCartState = cartReducer(undefined, { type: '@@INIT' });
    const defaultProductsState = productsReducer(undefined, { type: '@@INIT' });

    const testStore = configureStore({
        reducer: {
            auth: authReducer,
            ui: uiReducer,
            modalAlert: modalAlertReducer,
            modalConfirm: modalConfirmReducer,
            cart: cartReducer,
            products: productsReducer,
        },
        preloadedState: {
            auth: {
                ...defaultAuthState,
                isAuthenticated: true,
                user: CUSTOMER_MOCK
            },
            ui: {
                ...defaultUiState,
                isTouchDevice: false,
                screenSize: SCREEN_SIZE.LARGE,
                isDashboardPanelActive: true
            },
            modalAlert: defaultModalAlertState,
            modalConfirm: defaultModalConfirmState,
            cart: defaultCartState,
            products: defaultProductsState
        }
    });

    return render(
        <Provider store={testStore}>
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
    /*it('загружает данные корзины из MSW и рендерит их', async () => {
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
                    ...CART_ITEM_LIST_RESPONSE_MOCK,
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

    it('корректно обрабатывает очистку корзины', async () => {
        const user = userEvent.setup();

        server.use(
            http.delete('/api/cart/clear', () => {
                return HttpResponse.json({ message: 'Ошибка очистки корзины' }, { status: 500 });
            })
        );
    
        renderWithProviders(
            <>
                <ConfirmModal />
                <Cart />
            </>
        );
    
        const clearCartBtn = screen.getByRole('button', { name: /очистить корзину/i });
        expect(clearCartBtn).toBeInTheDocument();
        expect(clearCartBtn).toBeDisabled();

        await waitFor(() => {
            expect(screen.getByTestId('prod-counter')).toHaveTextContent('В корзине 2 товарные позиции');
            expect(screen.getByTestId('cart-current-total')).toHaveTextContent('38 500,00 руб.');
            expect(screen.getByRole('link', { name: /шлем интеграл/i })).toBeInTheDocument();
            expect(clearCartBtn).not.toBeDisabled();
        });
        
        // Клик на кнопку очистки корзины
        await user.click(clearCartBtn);

        const confirmModalBtn = await screen.findByRole('button', { name: /подтвердить/i });
        expect(confirmModalBtn).toBeInTheDocument();
        expect(confirmModalBtn).not.toBeDisabled();

        // Первый клик на кнопку подтверждения очистки корзины в модалке -> ошибка
        await user.click(confirmModalBtn);

        await waitFor(() => {
            expect(screen.getByText(/ошибка при выполнении действия/i)).toBeInTheDocument();
            expect(confirmModalBtn).not.toBeDisabled();
        });

        // Сброс обработчиков и второй клик на кнопку подтверждения очистки корзины в модалке -> успех
        server.resetHandlers();

        await user.click(confirmModalBtn);

        // Имитация закрытия модалки в связи с отсутствием анимации в JSDOM
        const { onFinalize } = getConfirmModalActions();
        expect(onFinalize).toBeDefined();
        assertDefined(onFinalize, 'onFinalize');
        act(() => {
            onFinalize();
        });

        await waitFor(() => {
            expect(screen.getByTestId('prod-counter')).toHaveTextContent('В корзине 0 товарных позиций');
            expect(screen.getByTestId('cart-current-total')).toHaveTextContent('0,00 руб.');
            expect(screen.getByText(/корзина пуста/i)).toBeInTheDocument();
            expect(screen.queryByRole('link', { name: /шлем интеграл/i })).toBeNull();
        });
    });*/

    it('корректно фильтрует товары в корзине по поиску в имени и артикуле', async () => {
        const user = userEvent.setup();
    
        renderWithProviders(<Cart />);

        const prodCounterP = screen.getByTestId('prod-counter');
        const searchInput = screen.getByPlaceholderText(/по наименованию или артикулу товара/i);
        const searchBtn = screen.getByText(/найти/i);

        expect(searchInput).toBeDisabled();
        expect(searchBtn).toBeDisabled();

        await waitFor(() => {
            expect(prodCounterP).toHaveTextContent('В корзине 2 товарные позиции');
            expect(searchInput).not.toBeDisabled();
            expect(searchBtn).toBeDisabled();
            
            expect(screen.getByRole('link', { name: /шлем интеграл/i })).toBeInTheDocument();
            expect(screen.getByRole('link', { name: /зеркала овальные/i })).toBeInTheDocument();
        });

        // Поиск коллапсибл-родителей и проверка атрибута
        const prod1CollapsDiv = screen.getByRole('link', { name: /шлем интеграл/i })
            .closest('.cart-item-card-collapsible');
        const prod2CollapsDiv = screen.getByRole('link', { name: /зеркала овальные/i })
            .closest('.cart-item-card-collapsible');

        expect(prod1CollapsDiv).not.toBeNull();
        expect(prod2CollapsDiv).not.toBeNull();
        assertDefined(prod1CollapsDiv, 'prod1CollapsDiv');
        assertDefined(prod2CollapsDiv, 'prod2CollapsDiv');
        expect(prod1CollapsDiv).toHaveAttribute('data-expanded', 'true');
        expect(prod2CollapsDiv).toHaveAttribute('data-expanded', 'true');

        // Фильтр по части имени первого товара
        await user.type(searchInput, 'шлем');
        expect(searchBtn).not.toBeDisabled();
        await user.click(searchBtn);

        await waitFor(() => {
            expect(prodCounterP).toHaveTextContent('В корзине 2 товарные позиции (показано 1)');
            expect(searchBtn).toBeDisabled();

            expect(prod1CollapsDiv).toHaveAttribute('data-expanded', 'true');
            expect(prod2CollapsDiv).toHaveAttribute('data-expanded', 'false');
        });

        // Стирание текста
        await user.clear(searchInput);
        expect(searchBtn).not.toBeDisabled();
        await user.click(searchBtn);

        await waitFor(() => {
            expect(prodCounterP).toHaveTextContent('В корзине 2 товарные позиции');
            expect(searchBtn).toBeDisabled();

            expect(prod1CollapsDiv).toHaveAttribute('data-expanded', 'true');
            expect(prod2CollapsDiv).toHaveAttribute('data-expanded', 'true');
        });

        // Фильтр по части SKU (артикулу) второго товара
        await user.type(searchInput, 'ZERK');
        expect(searchBtn).not.toBeDisabled();
        await user.click(searchBtn);

        await waitFor(() => {
            expect(prodCounterP).toHaveTextContent('В корзине 2 товарные позиции (показано 1)');
            expect(searchBtn).toBeDisabled();

            expect(prod1CollapsDiv).toHaveAttribute('data-expanded', 'false');
            expect(prod2CollapsDiv).toHaveAttribute('data-expanded', 'true');
        });
    });
});
