import { jest } from '@jest/globals';
import { userEvent } from '@testing-library/user-event';
import { render, screen, waitFor, act, within } from '@testing-library/react';
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
import { USER_ROLE, DISCOUNT_SOURCE, MIN_ORDER_AMOUNT, REQUEST_STATUS } from '@shared/constants.js';
import type { IUser, ICartItem, IProduct, IInitialOrderItemSnapshot } from '@shared/types/index.js';

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

beforeAll(() => {
    server.listen();
});

afterEach(() => {
    server.resetHandlers();
});

afterAll(() => {
    server.close();
});

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

        const confirmModalBtn = await screen.findByTestId('confirm-modal-btn');
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

        await waitFor(() => {
            expect(screen.getByTestId('prod-counter')).toHaveTextContent('В корзине 0 товарных позиций');
            expect(screen.getByTestId('cart-current-total')).toHaveTextContent('0,00 руб.');
            expect(screen.getByText(/корзина пуста/i)).toBeInTheDocument();
            expect(screen.queryByRole('link', { name: /шлем интеграл/i })).toBeNull();
        });
    });

    it('корректно фильтрует товары в корзине по поиску в имени и артикуле', async () => {
        const user = userEvent.setup();
    
        renderWithProviders(<Cart />);

        // Динамические геттеры для элементов
        const getProd1CollapsDiv = () =>
            screen.getByRole('link', { name: /шлем интеграл/i }).closest('.cart-item-card-collapsible');
        const getProd2CollapsDiv = () =>
            screen.getByRole('link', { name: /зеркала овальные/i }).closest('.cart-item-card-collapsible');

        const prodCounterP = screen.getByTestId('prod-counter');
        const searchInput = screen.getByPlaceholderText(/по наименованию или артикулу товара/i);
        const searchBtn = screen.getByText(/найти/i);

        expect(searchInput).toBeDisabled();
        expect(searchBtn).toBeDisabled();

        await waitFor(() => {
            expect(prodCounterP).toHaveTextContent('В корзине 2 товарные позиции');
            expect(searchInput).not.toBeDisabled();
            expect(searchBtn).toBeDisabled();
            
            expect(getProd1CollapsDiv()).toHaveAttribute('data-expanded', 'true');
            expect(getProd2CollapsDiv()).toHaveAttribute('data-expanded', 'true');
        });

        // Фильтр по части имени первого товара
        await user.type(searchInput, 'шлем');
        expect(searchBtn).not.toBeDisabled();
        await user.click(searchBtn);

        await waitFor(() => {
            expect(prodCounterP).toHaveTextContent('В корзине 2 товарные позиции (показано 1)');
            expect(searchBtn).toBeDisabled();

            expect(getProd1CollapsDiv()).toHaveAttribute('data-expanded', 'true');
            expect(getProd2CollapsDiv()).toHaveAttribute('data-expanded', 'false');
        });

        // Стирание текста
        await user.clear(searchInput);
        expect(searchBtn).not.toBeDisabled();
        await user.click(searchBtn);

        await waitFor(() => {
            expect(prodCounterP).toHaveTextContent('В корзине 2 товарные позиции');
            expect(searchBtn).toBeDisabled();

            expect(getProd1CollapsDiv()).toHaveAttribute('data-expanded', 'true');
            expect(getProd2CollapsDiv()).toHaveAttribute('data-expanded', 'true');
        });

        // Фильтр по части SKU (артикулу) второго товара
        await user.type(searchInput, 'ZERK');
        expect(searchBtn).not.toBeDisabled();
        await user.click(searchBtn);

        await waitFor(() => {
            expect(prodCounterP).toHaveTextContent('В корзине 2 товарные позиции (показано 1)');
            expect(searchBtn).toBeDisabled();

            expect(getProd1CollapsDiv()).toHaveAttribute('data-expanded', 'false');
            expect(getProd2CollapsDiv()).toHaveAttribute('data-expanded', 'true');
        });
    });

    it('корректно фильтрует и проблемные товары в корзине и сбрасывает фильтр', async () => {
        const user = userEvent.setup();
    
        server.use(
            http.get('/api/cart', () => {
                return HttpResponse.json({
                    ...CART_ITEM_LIST_RESPONSE_MOCK,
                    tradeProductList: [
                        PROD_1_MOCK,
                        { ...PROD_2_MOCK, available: 3 }
                    ],
                    cartItemList: [
                        CART_ITEM_1_MOCK,
                        { ...CART_ITEM_2_MOCK, quantityReduced: true }
                    ]
                });
            })
        );
    
        renderWithProviders(<Cart />);
    
        // Динамические геттеры для элементов
        const getWarningsBtn = () => screen.getByRole('button', { name: /показать проблемные товары/i });
        const queryAllProdsBtn = () => screen.queryByRole('button', { name: /все товары/i });
        const getAllProdsBtn = () => screen.getByRole('button', { name: /все товары/i });
        const getProd1CollapsDiv = () =>
            screen.getByRole('link', { name: /шлем интеграл/i }).closest('.cart-item-card-collapsible');
        const getProd2CollapsDiv = () =>
            screen.getByRole('link', { name: /зеркала овальные/i }).closest('.cart-item-card-collapsible');
    
        const prodCounterP = screen.getByTestId('prod-counter');
    
        await waitFor(() => {
            expect(prodCounterP).toHaveTextContent('В корзине 2 товарные позиции');
    
            expect(getWarningsBtn()).toBeInTheDocument();
            expect(queryAllProdsBtn()).toBeNull();
            
            expect(getProd1CollapsDiv()).toHaveAttribute('data-expanded', 'true');
            expect(getProd2CollapsDiv()).toHaveAttribute('data-expanded', 'true');
        });
    
        // Фильтр по проблемным товарам
        expect(getWarningsBtn()).not.toBeDisabled();
        await user.click(getWarningsBtn());
    
        await waitFor(() => {
            expect(prodCounterP).toHaveTextContent('В корзине 2 товарные позиции (показано 1)');
    
            expect(getWarningsBtn()).toBeInTheDocument();
            expect(getAllProdsBtn()).toBeInTheDocument();
    
            expect(getProd1CollapsDiv()).toHaveAttribute('data-expanded', 'false');
            expect(getProd2CollapsDiv()).toHaveAttribute('data-expanded', 'true');
        });
    
        // Очистка фильтра
        expect(getAllProdsBtn()).not.toBeDisabled();
        await user.click(getAllProdsBtn());
    
        await waitFor(() => {
            expect(prodCounterP).toHaveTextContent('В корзине 2 товарные позиции');
            
            expect(getWarningsBtn()).toBeInTheDocument();
            expect(queryAllProdsBtn()).toBeNull();
    
            expect(getProd1CollapsDiv()).toHaveAttribute('data-expanded', 'true');
            expect(getProd2CollapsDiv()).toHaveAttribute('data-expanded', 'true');
        });
    });

    it('исправляет корзину с уменьшенными по кол-ву и отсутствующие товарами после ошибки', async () => {
        const user = userEvent.setup();
    
        server.use(
            http.get('/api/cart', () => {
                return HttpResponse.json({
                    ...CART_ITEM_LIST_RESPONSE_MOCK,
                    tradeProductList: [
                        { ...PROD_1_MOCK, available: 0 },
                        { ...PROD_2_MOCK, available: 3 }
                    ],
                    cartItemList: [
                        { ...CART_ITEM_1_MOCK, outOfStock: true },
                        { ...CART_ITEM_2_MOCK, quantityReduced: true }
                    ]
                });
            }),
            http.patch('/api/cart/warnings', () => {
                return HttpResponse.json({
                    message: 'Ошибка при исправлении проблемных товаров в корзине',
                }, { status: 500 });
            })
        );
    
        renderWithProviders(<Cart />);

        const prodCounterP = screen.getByTestId('prod-counter');

        expect(screen.queryByRole('button', { name: /исправить вс[её]/i })).toBeNull();
    
        await waitFor(() => {
            expect(prodCounterP).toHaveTextContent('В корзине 2 товарные позиции');

            expect(screen.getByTestId('cart-original-total')).toHaveTextContent('45 000,00 руб.');
            expect(screen.getByTestId('cart-current-total')).toHaveTextContent('38 500,00 руб.');
            expect(screen.getByTestId('cart-saved-total')).toHaveTextContent('6 500,00 руб.');
    
            expect(screen.getByRole('button', { name: /исправить вс[её]/i })).toBeInTheDocument();
            
            expect(screen.getByRole('link', { name: /шлем интеграл/i })).toBeInTheDocument();
            expect(screen.getByRole('link', { name: /зеркала овальные/i })).toBeInTheDocument();
        });
    
        // Клик на кнопку исправления проблемных товаров -> ошибка
        const fixWarningsBtn = screen.getByRole('button', { name: /исправить вс[её]/i });
        expect(fixWarningsBtn).not.toBeDisabled();
        await user.click(fixWarningsBtn);

        await waitFor(() => {
            expect(screen.getByText(/ошибка сервера/i)).toBeInTheDocument();
            expect(screen.getByRole('button', { name: /повторить/i })).toBeInTheDocument();
        });

        // Установка успешного ответа для фикса проблем корзины
        server.use(
            http.patch('/api/cart/warnings', () => {
                return HttpResponse.json({
                    ...CART_ITEM_LIST_RESPONSE_MOCK,
                    message: 'Проблемные товары в корзине успешно исправлены',
                    tradeProductList: [
                        { ...PROD_2_MOCK, available: 3 }
                    ],
                    cartItemList: [
                        { ...CART_ITEM_2_MOCK, quantity: 3 }
                    ]
                }, { status: 200 });
            })
        );

        // Клик на кнопку исправления проблемных товаров -> успех
        expect(fixWarningsBtn).not.toBeDisabled();
        await user.click(fixWarningsBtn);
    
        await waitFor(() => {
            expect(prodCounterP).toHaveTextContent('В корзине 1 товарная позиция');

            // Сумма без скидки: 0 * 20000 + 3 * 1000 = 0 + 3000 = 3000
            expect(screen.getByTestId('cart-original-total')).toHaveTextContent('3 000,00 руб.');

            // Сумма со скидкой: 0 * (20000 - 15%) + 3 * (1000 - 10%) = 0 + 2700 = 2700
            expect(screen.getByTestId('cart-current-total')).toHaveTextContent('2 700,00 руб.');

            // Скидка: 3000 - 2700 = 300
            expect(screen.getByTestId('cart-saved-total')).toHaveTextContent('300,00 руб.');
    
            expect(screen.queryByRole('button', { name: /исправить вс[её]/i })).toBeNull();
            
            expect(screen.queryByRole('link', { name: /шлем интеграл/i })).toBeNull();
            expect(screen.getByRole('link', { name: /зеркала овальные/i })).toBeInTheDocument();
        });
    });

    it('исправляет неактивные и удалённые из магазина товары в корзине', async () => {
        const user = userEvent.setup();
    
        server.use(
            http.get('/api/cart', () => {
                return HttpResponse.json({
                    ...CART_ITEM_LIST_RESPONSE_MOCK,
                    tradeProductList: [
                        { ...PROD_1_MOCK, isActive: false }
                    ],
                    cartItemList: [
                        { ...CART_ITEM_1_MOCK, inactive: true },
                        {
                            ...CART_ITEM_2_MOCK,
                            deleted: true,
                            productSnapshot: {
                                _type: 'snapshot',
                                name: PROD_2_MOCK.name
                            }
                        }
                    ]
                });
            }),
            http.patch('/api/cart/warnings', () => {
                return HttpResponse.json({
                    ...CART_ITEM_LIST_RESPONSE_MOCK,
                    message: 'Проблемные товары в корзине успешно исправлены',
                    tradeProductList: [],
                    cartItemList: []
                });
            })
        );
    
        renderWithProviders(<Cart />);

        const prodCounterP = screen.getByTestId('prod-counter');

        expect(screen.queryByRole('button', { name: /исправить вс[её]/i })).toBeNull();
    
        await waitFor(() => {
            expect(prodCounterP).toHaveTextContent('В корзине 2 товарные позиции');

            // Сумма без скидки: 2 * 20000 + 5 * 0 = 40000 + 0 = 40000
            expect(screen.queryByTestId('cart-original-total')).toHaveTextContent('40 000,00 руб.');

            // Сумма со скидкой: 2 * (20000 - 15%) + 5 * (0 - 10%) = 34000 + 0 = 34000
            expect(screen.getByTestId('cart-current-total')).toHaveTextContent('34 000,00 руб.');

            // Скидка: 40000 - 34000 = 6000
            expect(screen.queryByTestId('cart-saved-total')).toHaveTextContent('6 000,00 руб.');
    
            expect(screen.getByRole('button', { name: /исправить вс[её]/i })).toBeInTheDocument();
            
            expect(screen.getByRole('link', { name: /шлем интеграл/i })).toBeInTheDocument();
            expect(screen.queryByRole('link', { name: /зеркала овальные/i })).toBeNull();
        
            const deletedCartItem = screen.getByTestId('deleted-cart-item');
            expect(within(deletedCartItem).getByText(/зеркала овальные/i)).toBeInTheDocument();
        });
    
        // Клик на кнопку исправления проблемных товаров
        const fixWarningsBtn = screen.getByRole('button', { name: /исправить вс[её]/i });
        expect(fixWarningsBtn).not.toBeDisabled();
        await user.click(fixWarningsBtn);
    
        await waitFor(() => {
            expect(prodCounterP).toHaveTextContent('В корзине 0 товарных позиций');

            expect(screen.queryByTestId('cart-original-total')).toBeNull();
            expect(screen.getByTestId('cart-current-total')).toHaveTextContent('0,00 руб.');
            expect(screen.queryByTestId('cart-saved-total')).toBeNull();
    
            expect(screen.queryByRole('button', { name: /исправить вс[её]/i })).toBeNull();
            
            expect(screen.queryByRole('link', { name: /шлем интеграл/i })).toBeNull();
            expect(screen.queryByRole('link', { name: /зеркала овальные/i })).toBeNull();
            
            expect(screen.queryByTestId('deleted-cart-item')).toBeNull();
        });
    });

    it('корректно обрабатывает ошибку сервера при начале оформления заказа', async () => {
        const user = userEvent.setup();

        server.use(
            http.post('/api/checkout/draft-orders', () => {
                return HttpResponse.json({ message: 'Не удалось создать черновик заказа' }, { status: 500 });
            })
        );
    
        renderWithProviders(
            <>
                <AlertModal />
                <Cart />
            </>
        );
    
        const placeOrderBtn = screen.getByRole('button', { name: /оформить заказ/i });
        expect(placeOrderBtn).toBeInTheDocument();
        expect(placeOrderBtn).toBeDisabled();

        await waitFor(() => {
            expect(screen.getByTestId('prod-counter')).toHaveTextContent('В корзине 2 товарные позиции');
            expect(screen.getByTestId('cart-current-total')).toHaveTextContent('38 500,00 руб.');
            expect(screen.getByRole('link', { name: /шлем интеграл/i })).toBeInTheDocument();
            expect(placeOrderBtn).not.toBeDisabled();
        });

        // Клик на кнопку оформления заказа
        await user.click(placeOrderBtn);

        const dismissModalBtn = await screen.findByTestId('dismiss-modal-btn');
        expect(dismissModalBtn).toBeInTheDocument();
        expect(dismissModalBtn).not.toBeDisabled();

        expect(screen.getByText('Не удалось создать черновик заказа')).toBeInTheDocument();
        expect(placeOrderBtn).toBeDisabled();

        // Клик на кнопку подтверждения модалки
        await user.click(dismissModalBtn);

        await waitFor(() => {
            expect(screen.queryByTestId('dismiss-modal-btn')).toBeNull();
            expect(placeOrderBtn).not.toBeDisabled();
        });
    });*/

    it('корректно обрабатывает оформление заказа с суммой меньше минимальной', async () => {
        const user = userEvent.setup();
        let reqBody: { initialOrderItemSnapshots: IInitialOrderItemSnapshot[] } | undefined;

        server.use(
            http.get('/api/cart', () => {
                return HttpResponse.json({
                    ...CART_ITEM_LIST_RESPONSE_MOCK,
                    tradeProductList: [
                        { ...PROD_1_MOCK, isActive: false },
                        { ...PROD_2_MOCK, available: 1, price: 900 }
                    ],
                    cartItemList: [
                        { ...CART_ITEM_1_MOCK, outOfStock: true },
                        { ...CART_ITEM_2_MOCK, quantityReduced: true }
                    ]
                });
            }),
            http.post('/api/checkout/draft-orders', async ({ request }) => {
                reqBody = await request.json() as { initialOrderItemSnapshots: IInitialOrderItemSnapshot[] };

                return HttpResponse.json({
                    message: 'Сумма заказа меньше минимальной',
                    reason: REQUEST_STATUS.LIMITATION,
                    tradeProductList: [{ ...PROD_2_MOCK, available: 1, price: 900 }],
                    cartItemList: [{ ...CART_ITEM_2_MOCK, quantity: 1 }],
                    customerDiscount: 10,
                    currentTotal: 900,
                    cartItemAdjustments: [
                        {
                            id: PROD_1_ID,
                            name: PROD_1_MOCK.name,
                            adjustments: { inactive: true }
                        },
                        {
                            id: PROD_2_ID,
                            name: PROD_2_MOCK.name,
                            adjustments: {
                                quantityReduced: {
                                    old: 5,
                                    corrected: 1
                                },
                                price: {
                                    old: 1000,
                                    corrected: 900
                                }
                            }
                        }
                    ]
                }, { status: 422 });
            })
        );
    
        renderWithProviders(
            <>
                <AlertModal />
                <Cart />
            </>
        );
    
        const placeOrderBtn = screen.getByRole('button', { name: /оформить заказ/i });
        expect(placeOrderBtn).toBeInTheDocument();
        expect(placeOrderBtn).toBeDisabled();

        await waitFor(() => {
            expect(placeOrderBtn).not.toBeDisabled();
            expect(screen.getByTestId('prod-counter')).toHaveTextContent('В корзине 2 товарные позиции');

            // Сумма без скидки: 2 * 20000 + 5 * 900 = 40000 + 4500 = 44500
            expect(screen.queryByTestId('cart-original-total')).toHaveTextContent('44 500,00 руб.');

            // Сумма со скидкой: 2 * (20000 - 15%) + 5 * (900 - 10%) = 34000 + 4050 = 38050
            expect(screen.getByTestId('cart-current-total')).toHaveTextContent('38 050,00 руб.');

            // Скидка: 44500 - 38050 = 6450
            expect(screen.queryByTestId('cart-saved-total')).toHaveTextContent('6 450,00 руб.');

            expect(screen.getByRole('link', { name: /шлем интеграл/i })).toBeInTheDocument();
            expect(screen.getByRole('link', { name: /зеркала овальные/i })).toBeInTheDocument();
        });

        // Клик на кнопку оформления заказа
        await user.click(placeOrderBtn);

        // Проверка отправляемого тела запроса
        await waitFor(() => {
            expect(reqBody).not.toBeNull();
        });

        assertDefined(reqBody, 'reqBody');
        expect(reqBody.initialOrderItemSnapshots).toHaveLength(2);
        expect(reqBody.initialOrderItemSnapshots[1]).toEqual({
            productId: PROD_2_ID,
            priceSnapshot: 900,
            appliedDiscountSnapshot: 10,
            appliedDiscountSourceSnapshot: DISCOUNT_SOURCE.CUSTOMER
        });

        // Проверка модалки внимания и изменений встейте
        const dismissModalBtn = await screen.findByTestId('dismiss-modal-btn');
        expect(dismissModalBtn).toBeInTheDocument();
        expect(dismissModalBtn).not.toBeDisabled();

        expect(screen.getByText('Сумма заказа меньше минимальной')).toBeInTheDocument();

        expect(screen.getByText(/снят с продажи/i)).toBeInTheDocument();
        expect(screen.getByText(/уменьшено количество/i)).toBeInTheDocument();
        expect(screen.getByText(/изменена цена/i)).toBeInTheDocument();

        const alertModalMessageDiv = screen.getByTestId('alert-modal-message');
        expect(alertModalMessageDiv).toHaveTextContent(`Товар снят с продажи: "${PROD_1_MOCK.name}"`);
        expect(alertModalMessageDiv).toHaveTextContent(
            `Уменьшено количество товара "${PROD_2_MOCK.name}": с 5 до 1`
        );
        expect(alertModalMessageDiv).toHaveTextContent(
            `Изменена цена на товар "${PROD_2_MOCK.name}": с 1 000,00 до 900,00`
        );

        expect(screen.getByTestId('prod-counter')).toHaveTextContent('В корзине 1 товарная позиция');

        // Сумма без скидки: 0 + 1 * 900 = 0 + 900 = 900
        expect(screen.queryByTestId('cart-original-total')).toHaveTextContent('900,00 руб.');

        // Сумма со скидкой: 0  + 1 * (900 - 10%) = 0 + 810 = 810
        expect(screen.getByTestId('cart-current-total')).toHaveTextContent('810,00 руб.');

        // Скидка: 900 - 810 = 90
        expect(screen.queryByTestId('cart-saved-total')).toHaveTextContent('90,00 руб.');

        expect(screen.queryByRole('link', { name: /шлем интеграл/i })).toBeNull();
        expect(screen.getByRole('link', { name: /зеркала овальные/i })).toBeInTheDocument();

        // Клик на кнопку подтверждения модалки внимания
        await user.click(dismissModalBtn);

        await waitFor(() => {
            expect(screen.queryByText('Сумма заказа меньше минимальной')).toBeNull();
            expect(screen.queryByTestId('dismiss-modal-btn')).toBeNull();
        });
    });
});
