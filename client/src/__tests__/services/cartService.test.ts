import {
    buildCartProductData,
    calculateCartTotals
} from '@/services/cartService.js';
import type { ICartItem, IProduct } from '@shared/types/index.js';

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
});
