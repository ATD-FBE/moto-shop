import {
    toError,
    formatDateOnly,
    ensureArray,
    getAppliedDiscountData,
    getLastFinancialsEventEntry
} from '@shared/commonHelpers.js';
import { DISCOUNT_SOURCE } from '@shared/constants.js';

describe('Helpers Unit Tests - Модуль Common Helpers', () => {
    // ==========================================
    // ensureArray
    // ==========================================

    describe('Функция ensureArray', () => {
        it('должна возвращать пустой массив, если передан undefined', () => {
            expect(ensureArray(undefined)).toEqual([]);
        });

        it('должна возвращать тот же массив, если передан массив', () => {
            const input = [1, 2, 3];
            expect(ensureArray(input)).toBe(input);
        });

        it('должна заворачивать одиночное значение в массив', () => {
            expect(ensureArray('Honda')).toEqual(['Honda']);
            expect(ensureArray(42)).toEqual([42]);
            expect(ensureArray('')).toEqual(['']);
            expect(ensureArray(null)).toEqual([null]);
        });
    });

    // ==========================================
    // toError
    // ==========================================

    describe('Функция toError', () => {
        it('должна возвращать тот же объект ошибки, если он передан', () => {
            const originalError = new Error('Катастрофа!');
            expect(toError(originalError)).toBe(originalError);
        });

        it('должна превращать строку в объект ошибки с этим сообщением', () => {
            const err = toError('Сломался карбюратор');
            expect(err).toBeInstanceOf(Error);
            expect(err.message).toBe('Сломался карбюратор');
        });

        it('должна парсить объект и вытаскивать из него поле message', () => {
            const obj = { message: 'Ошибка базы данных', code: 500 };
            const err = toError(obj);
            expect(err.message).toBe('Ошибка базы данных');
        });

        it('должна превращать объект в строку JSON, если в нём нет поля message', () => {
            const obj = { status: 'fail', reason: 'no_money', code: 412 };
            const err = toError(obj);
            expect(err.message).toBe(JSON.stringify(obj));
        });

        it('должна возвращать дефолтное сообщение, если объект содержит циклическую ссылку', () => {
            const cyclicObj: any = { name: 'Yamaha R1' };
            cyclicObj.self = cyclicObj; 
            const err = toError(cyclicObj);
            expect(err.message).toBe('[Circular or Unformattable Object]');
        });

        it('должна корректно обрабатывать примитивы вроде чисел или булевых значений', () => {
            expect(toError(404).message).toBe('404');
            expect(toError(true).message).toBe('true');
            expect(toError(null).message).toBe('null');
            expect(toError(undefined).message).toBe('undefined');
        });
    });

    // ==========================================
    // getAppliedDiscountData
    // ==========================================

    describe('Функция getAppliedDiscountData', () => {
        it('должна возвращать NONE, если обе скидки равны нулю', () => {
            const result = getAppliedDiscountData(0, 0);
            expect(result).toEqual({
                appliedDiscount: 0,
                appliedDiscountSource: DISCOUNT_SOURCE.NONE
            });
        });

        it('должна выбирать скидку на товар, если она больше скидки клиента', () => {
            const result = getAppliedDiscountData(15, 10);
            expect(result.appliedDiscount).toBe(15);
            expect(result.appliedDiscountSource).toBe(DISCOUNT_SOURCE.PRODUCT);
        });

        it('должна выбирать скидку клиента, если она больше скидки на товар', () => {
            const result = getAppliedDiscountData(5, 12);
            expect(result.appliedDiscount).toBe(12);
            expect(result.appliedDiscountSource).toBe(DISCOUNT_SOURCE.CUSTOMER);
        });

        it('должна отдавать приоритет клиентской скидке при равенстве скидок', () => {
            const result = getAppliedDiscountData(10, 10);
            expect(result.appliedDiscount).toBe(10);
            expect(result.appliedDiscountSource).toBe(DISCOUNT_SOURCE.CUSTOMER);
        });

        it('должна возвращать объект строго определенной структуры', () => {
            const result = getAppliedDiscountData(20, 15);
            expect(result).toHaveProperty('appliedDiscount');
            expect(result).toHaveProperty('appliedDiscountSource');
            expect(result).toEqual({
                appliedDiscount: expect.any(Number),
                appliedDiscountSource: expect.any(String)
            });
        });
    });

    // ==========================================
    // formatDateOnly
    // ==========================================

    describe('Функция formatDateOnly', () => {
        it('должна возвращать пустую строку, если date не передан или имеет falsy-значение', () => {
            expect(formatDateOnly(undefined)).toEqual('');
            expect(formatDateOnly(null)).toEqual('');
            expect(formatDateOnly(0)).toEqual('');
            expect(formatDateOnly('')).toBe('');
        });

        it('должна возвращать пустую строку, если объект даты возвращает невалидное время', () => {
            const str = 'abc';
            expect(formatDateOnly(str)).toEqual('');

            const date = new Date(str);
            expect(formatDateOnly(date)).toEqual('');
        });

        it('должна корректно подставлять ведущие нули для однозначных месяцев и дней', () => {
            const singleDigitDate = new Date(2026, 0, 1); // 1 января 2026
            expect(formatDateOnly(singleDigitDate)).toEqual('2026-01-01');
        });

        it(
            'должна возвращать строку в формате YYYY-MM-DD' +
            ' при передаче валидной строки, числа или объека даты',
            () => {
                const targetDate = new Date(2026, 5, 26);
                const timestamp = targetDate.getTime();
                
                expect(formatDateOnly(targetDate)).toEqual('2026-06-26');
                expect(formatDateOnly(timestamp)).toEqual('2026-06-26');
                expect(formatDateOnly('2026-06-26')).toEqual('2026-06-26');
                expect(formatDateOnly('2026-06-26T12:00:00')).toEqual('2026-06-26');
            }
        );
    });

    // ==========================================
    // formatDateOnly
    // ==========================================

    describe('Функция getLastFinancialsEventEntry', () => {
        it('должна возвращать null, если история пустая', () => {
            expect(getLastFinancialsEventEntry([])).toBeNull();
        });
    
        it('должна возвращать последнее НЕ аннулированное событие с конца массива', () => {
            const history = [
                { id: 1, voided: { flag: false } },
                { id: 2, voided: { flag: false } }, // Целевой объект для возврата
                { id: 3, voided: { flag: true } },
                { id: 4, voided: { flag: true } }
            ];
    
            const result = getLastFinancialsEventEntry(history);
            expect(result).toBe(history[1]);
        });
    
        it('должна возвращать null, если абсолютно все события в истории аннулированы', () => {
            const history = [
                { id: 1, voided: { flag: true } },
                { id: 2, voided: { flag: true } },
            ];
    
            expect(getLastFinancialsEventEntry(history)).toBeNull();
        });
    
        it('должна корректно обрабатывать элементы без объекта voided (считать их валидными)', () => {
            const history = [
                { id: 1 },
                { id: 2 },
                { id: 3, voided: null } // Целевой объект для возврата
            ];
    
            const result = getLastFinancialsEventEntry(history);
            expect(result).toBe(history[2]);
        });
    
        it('должна игнорировать пустые (falsy) элементы внутри массива', () => {
            const history = [
                { id: 1 },
                null as any,
                { id: 2, voided: { flag: true } },
                undefined as any
            ];
    
            const result = getLastFinancialsEventEntry(history);
            expect(result).toBe(history[0]);
        });
    });
});
