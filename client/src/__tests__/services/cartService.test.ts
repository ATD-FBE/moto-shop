import { configureStore } from '@reduxjs/toolkit';
import authReducer from '@/redux/slices/authSlice.js';
import cartReducer, {
    defaultCartItemExtendedParams as defCartItemExtParams
} from '@/redux/slices/cartSlice.js';
import productsReducer from '@/redux/slices/productsSlice.js';
import {
    buildCartProductData,
    calculateCartTotals,
    reconcileCartWithProducts
} from '@/services/cartService.js';
import { loadGuestCartFromLocalStorage } from '@/services/guestCartService.js';
import { assertDefined } from '@shared/commonHelpers.js';
import type { EnhancedStore } from '@reduxjs/toolkit';
import type { TRootState, TAppDispatch } from '@/types/index.js';
import type { ICartItem, IProduct } from '@shared/types/index.js';

// Мок localStorage для проверки сохранения гостевой корзины
const localStorageMock = (() => {
    let store: Record<string, string> = {};

    return {
        getItem: (key: string) => store[key] || null,
        setItem: (key: string, value: string) => { store[key] = value.toString(); },
        clear: () => { store = {}; }
    };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('Services Unit Tests - Модуль Cart Service', () => {
    // ==========================================
    // buildCartProductData
    // ==========================================
    
    describe('Функция buildCartProductData', () => {
        it('должна возвращать массив объектов с корректными данными для товаров в корзине', () => {
            const cartItemList = [
                { id: '1', quantity: 2 },
                { id: '2', quantity: 1 }
            ] as ICartItem[];
            const productMap = {
                1: { price: 100, discount: 0 } as IProduct,
                2: { price: 200, discount: 5 } as IProduct
            };

            expect(buildCartProductData(cartItemList, productMap)).toEqual([
                { price: 100, discount: 0, quantity: 2 },
                { price: 200, discount: 5, quantity: 1 }
            ]);
        });

        it('должна фильтровать массив данных для товаров в корзине', () => {
            const cartItemList = [
                { id: '1', quantity: 2, deleted: true },
                { id: '2', quantity: 1 },
            ] as ICartItem[];
            const productMap = {
                1: { price: 100, discount: 0 } as IProduct,
                2: { price: 200, discount: 0 } as IProduct
            };

            expect(buildCartProductData(cartItemList, productMap)).toEqual([
                { price: 200, discount: 0, quantity: 1 }
            ]);
        });

        it('должна устанавливать дефолты, если товара нет в карте', () => {
            const cartItemList = [
                { id: '1', quantity: 2 },
                { id: '2', quantity: 1 },
            ] as ICartItem[];
            const productMap = {
                1: { price: 100, discount: 10 } as IProduct,
                3: { price: 200, discount: 8 } as IProduct
            };

            expect(buildCartProductData(cartItemList, productMap)).toEqual([
                { price: 100, discount: 10, quantity: 2 },
                { price: 0, discount: 0, quantity: 1 }
            ]);
        });
    });

    // ==========================================
    // calculateCartTotals
    // ==========================================
    
    describe('Функция calculateCartTotals', () => {
        it('должна возвращать объект с корректными суммами, применяя максимальную скидку', () => {
            const customerDiscount = 5;
            const cartProductData = [
                { price: 100, quantity: 3, discount: 3 }, // 300 - 5% = 285
                { price: 200, quantity: 2, discount: 0 }, // 400 - 5% = 380
                { price: 150, quantity: 10, discount: 7 } // 1500 - 7% = 1395
            ]; // Итого: rawTotal = 2200, discountedTotal = 2060

            expect(calculateCartTotals(cartProductData, customerDiscount)).toEqual({
                rawTotal: 2200,
                discountedTotal: 2060
            });
        });

        it('должна правильно округлять дробные суммы до двух знаков после запятой', () => {
            const customerDiscount = 0;
            const cartProductData = [
                { price: 59.697, quantity: 5, discount: 9 }
            ];
            
            // rawTotal = 59.697 * 5 = 298.485 -> должно округлиться до 298.49
            // discountedTotal = 298.485 - 26.86365 = 271.62135 -> должно округлиться до 271.62

            expect(calculateCartTotals(cartProductData, customerDiscount)).toEqual({
                rawTotal: 298.49,
                discountedTotal: 271.62
            });
        });

        it('должна возвращать нули, если корзина пуста', () => {
            expect(calculateCartTotals([], 10)).toEqual({
                rawTotal: 0,
                discountedTotal: 0
            });
        });
    });

    // ==========================================
    // reconcileCartWithProducts
    // ==========================================

    describe('Thunk-функция reconcileCartWithProducts', () => {
        const PROD_1_ID = 'moto-detail-1';
        const PROD_2_ID = 'moto-detail-2';

        const PROD_1_BASE = {
            id: PROD_1_ID,
            price: 1000,
            available: 5,
            discount: 0,
            isActive: true
        } as IProduct;
        const PROD_2_BASE = {
            id: PROD_2_ID,
            price: 2000,
            available: 5,
            discount: 10,
            isActive: true
        } as IProduct;

        const CART_ITEM_1_BASE = { ...defCartItemExtParams, id: PROD_1_ID, quantity: 2 };
        const CART_ITEM_2_BASE = { ...defCartItemExtParams, id: PROD_2_ID, quantity: 1 };

        let store: EnhancedStore<Pick<
            TRootState, 'auth' | 'cart' | 'products'>
        > & {
            dispatch: TAppDispatch
        };
    
        beforeEach(() => {
            // Установка тестовых данных в локальном хранилище
            localStorageMock.setItem('guestCart', JSON.stringify([CART_ITEM_1_BASE, CART_ITEM_2_BASE]));
            
            // Создание тестового стора
            const defaultAuthState = authReducer(undefined, { type: '@@INIT' });
            const defaultCartState = cartReducer(undefined, { type: '@@INIT' });
            const defaultProductsState = productsReducer(undefined, { type: '@@INIT' });

            store = configureStore({
                reducer: {
                    auth: authReducer,
                    cart: cartReducer,
                    products: productsReducer
                },
                // Установка начального дефолтного состояния
                preloadedState: {
                    auth: { ...defaultAuthState }, // Юзер не аутентифицирован
                    cart: {
                        ...defaultCartState,
                        byId: {
                            [PROD_1_ID]: CART_ITEM_1_BASE,
                            [PROD_2_ID]: CART_ITEM_2_BASE
                        },
                        ids: [PROD_1_ID, PROD_2_ID],
                        rawTotal: 4000,         // 2 * 1000 + 1 * 2000
                        discountedTotal: 3800   // 2 * 1000 + 1 * (2000 - 10%)
                    },
                    products: {
                        ...defaultProductsState,
                        byId: {
                            [PROD_1_ID]: PROD_1_BASE,
                            [PROD_2_ID]: PROD_2_BASE
                        },
                        ids: [PROD_1_ID, PROD_2_ID]
                    }
                }
            });
        });

        afterEach(() => {
            localStorageMock.clear();
        });

        it(
            'должна оставить товар в корзине без изменений, если сервер не прислал его в списке',
            () => {
                const serverProducts = [{ ...PROD_2_BASE }];

                store.dispatch(reconcileCartWithProducts(serverProducts));
            
                // Проверка данных после изменения состояния
                const resultState = store.getState();
                
                expect(resultState.cart.ids).toEqual([PROD_1_ID, PROD_2_ID]);
                
                const cartItem1 = resultState.cart.byId[PROD_1_ID];
                expect(cartItem1).not.toBeNull();
                assertDefined(cartItem1, 'cartItem1');
                expect(cartItem1.quantity).toBe(2);
                expect(cartItem1.outOfStock).toBe(false);

                expect(resultState.cart.rawTotal).toEqual(4000);
                expect(resultState.cart.discountedTotal).toEqual(3800);
            
                const guestCart = loadGuestCartFromLocalStorage();
                expect(guestCart.length).toBe(2);
                expect(guestCart.find(item => item.id === PROD_1_ID)).toBeDefined();
            }
        );
    
        it(
            'должна удалить товар из корзины гостя, обновить суммы и localStorage, ' +
            'если товара больше нет в наличии',
            () => {
                const serverProducts = [
                    { ...PROD_1_BASE, available: 0 },
                    { ...PROD_2_BASE }
                ];
        
                store.dispatch(reconcileCartWithProducts(serverProducts));
        
                // Проверка данных после изменения состояния
                const resultState = store.getState();

                const prod1 = resultState.products.byId[PROD_1_ID];
                expect(prod1).not.toBeNull();
                assertDefined(prod1, 'prod1');
                expect(prod1.available).toBe(0);
                
                expect(resultState.cart.ids).toEqual([PROD_2_ID]);
                expect(resultState.cart.rawTotal).toEqual(2000);
                expect(resultState.cart.discountedTotal).toEqual(1800);
        
                const guestCart = loadGuestCartFromLocalStorage();
                expect(guestCart.length).toBe(1);
                expect(guestCart[0]).toEqual({ ...CART_ITEM_2_BASE });
            }
        );

        it(
            'должна обновить товар в корзине гостя, суммы и localStorage, ' +
            'если кол-во товара на складе меньше, чем заказно в корзине',
            () => {
                const serverProducts = [
                    { ...PROD_1_BASE, available: 1 },
                    { ...PROD_2_BASE }
                ];
        
                store.dispatch(reconcileCartWithProducts(serverProducts));
        
                // Проверка данных после изменения состояния
                const resultState = store.getState();

                const prod1 = resultState.products.byId[PROD_1_ID];
                expect(prod1).not.toBeNull();
                assertDefined(prod1, 'prod1');
                expect(prod1.available).toBe(1);
                
                expect(resultState.cart.ids).toEqual([PROD_1_ID, PROD_2_ID]);
                expect(resultState.cart.rawTotal).toEqual(3000);          // 1 * 1000 + 1 * 2000
                expect(resultState.cart.discountedTotal).toEqual(2800);   // 1 * 1000 + 1 * (2000 - 10%)

                const cartItem1 = resultState.cart.byId[PROD_1_ID];
                expect(cartItem1).not.toBeNull();
                assertDefined(cartItem1, 'cartItem1');
                expect(cartItem1.quantity).toBe(1);
        
                const guestCart = loadGuestCartFromLocalStorage();
                expect(guestCart.length).toBe(2);
                expect(guestCart[0]).toEqual({ ...CART_ITEM_1_BASE, quantity: 1 });
            }
        );
    });
});
