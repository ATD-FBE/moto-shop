import {
    calculateOrderTotals
} from '@server/services/orderService.js';

describe('Модуль Order Service', () => {
    // ==========================================
    // 1. calculateOrderTotals
    // ==========================================
    
    describe('Функция calculateOrderTotals', () => {
        it('должна корректно обрабатывать список товаров в черновике заказа', () => {
            const draftItemList = [
                { quantity: 5, priceSnapshot: 100, appliedDiscountSnapshot: 10 }, // 500 - 10% = 450
                { quantity: 3, priceSnapshot: 200, appliedDiscountSnapshot: 5 }   // 600 - 5% = 570
            ] as any; // Итого: subtotal = 1100, total = 1020, savings = 80

            expect(calculateOrderTotals(draftItemList)).toEqual({
                subtotalAmount: 1100,
                totalSavings: 80,
                totalAmount: 1020
            });
        });

        it('должна корректно обрабатывать список товаров в подтвержденном заказе', () => {
            const confirmedItemList = [
                { quantity: 2, originalUnitPrice: 150, appliedDiscount: 20 }, // 300 - 20% = 240
                { quantity: 1, originalUnitPrice: 500, appliedDiscount: 0 }   // 500 - 0% = 500
            ] as any; // Итого: subtotal = 800, total = 740, savings = 60

            expect(calculateOrderTotals(confirmedItemList, { confirmed: true })).toEqual({
                subtotalAmount: 800,
                totalSavings: 60,
                totalAmount: 740
            });
        });

        it('должна правильно округлять дробные суммы до двух знаков после запятой', () => {
            const messyItemList = [
                { quantity: 1, priceSnapshot: 10.33, appliedDiscountSnapshot: 3.5 }
            ] as any;
            
            // subtotal = 10.33
            // discountFactor = 1 - 0.035 = 0.965
            // totalAmount = 10.33 * 0.965 = 9.96845 -> должно округлиться до 9.97
            // totalSavings = 10.33 - 9.96845 = 0.36155 -> должно округлиться до 0.36

            expect(calculateOrderTotals(messyItemList)).toEqual({
                subtotalAmount: 10.33,
                totalSavings: 0.36,
                totalAmount: 9.97
            });
        });
    });
});
