import {
    calculateOrderTotals,
    calculateOrderFinancials
} from '@server/services/orderService.js';
import { FINANCIALS_EVENT } from '@shared/constants.js';
import type {
    TDbOrderDraftItem,
    TDbOrderFinalItem,
    TDbOrderFinancialsEventEntry
} from '@server/types/index.js';

describe('Модуль Order Service', () => {
    // ==========================================
    // calculateOrderTotals
    // ==========================================
    
    describe('Функция calculateOrderTotals', () => {
        it('должна корректно обрабатывать список товаров в черновике заказа', () => {
            const draftItemList = [
                { quantity: 5, priceSnapshot: 100, appliedDiscountSnapshot: 10 }, // 500 - 10% = 450
                { quantity: 3, priceSnapshot: 200, appliedDiscountSnapshot: 5 }   // 600 - 5% = 570
            ] as TDbOrderDraftItem[]; // Итого: subtotal = 1100, total = 1020, savings = 80

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
            ] as TDbOrderFinalItem[]; // Итого: subtotal = 800, total = 740, savings = 60

            expect(calculateOrderTotals(confirmedItemList, { confirmed: true })).toEqual({
                subtotalAmount: 800,
                totalSavings: 60,
                totalAmount: 740
            });
        });

        it('должна правильно округлять дробные суммы до двух знаков после запятой', () => {
            const messyItemList = [
                { quantity: 1, priceSnapshot: 10.33, appliedDiscountSnapshot: 3.5 }
            ] as TDbOrderDraftItem[];
            
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

        it('должна возвращать нули, если список заказанных товаров пуст', () => {
            expect(calculateOrderTotals([])).toEqual({
                subtotalAmount: 0,
                totalSavings: 0,
                totalAmount: 0
            });
        });
    });

    // ==========================================
    // calculateOrderFinancials
    // ==========================================
    
    describe('Функция calculateOrderFinancials', () => {
        it(
            'должна принимать финансовую историю заказа ' +
            'и возвращать объект с расситанными суммами всех оплат и возвратов',
            () => {
                const history = [
                    { event: FINANCIALS_EVENT.PAYMENT_SUCCESS, action: { amount: 100 } },
                    { event: FINANCIALS_EVENT.REFUND_SUCCESS, action: { amount: 50 } },
                    { event: FINANCIALS_EVENT.PAYMENT_SUCCESS, action: { amount: 200 } },
                    { event: FINANCIALS_EVENT.PAYMENT_FAILED, action: { amount: 250 } },
                    { event: FINANCIALS_EVENT.REFUND_SUCCESS, action: { amount: 300 } },
                ] as TDbOrderFinancialsEventEntry[];

                expect(calculateOrderFinancials(history)).toEqual({
                    totalPaid: 300,
                    totalRefunded: 350
                });
            }
        );

        it('должна правильно фильтровать историю финансов заказа', () => {
                const history = [
                    { event: FINANCIALS_EVENT.PAYMENT_SUCCESS, action: { amount: 1000 } },
                    { event: FINANCIALS_EVENT.REFUND_SUCCESS, action: { amount: 500 }, voided: null },
                    { event: FINANCIALS_EVENT.PAYMENT_SUCCESS, action: { amount: 200 }, voided: { flag: true } },
                    { event: FINANCIALS_EVENT.REFUND_SUCCESS, action: { amount: 300 } },
                ] as TDbOrderFinancialsEventEntry[];

                expect(calculateOrderFinancials(history)).toEqual({
                    totalPaid: 1000,
                    totalRefunded: 800
                });
            }
        );

        it('должна возвращать нули, если история пуста', () => {
            expect(calculateOrderFinancials([])).toEqual({
                totalPaid: 0,
                totalRefunded: 0
            });
        });
    });
});
