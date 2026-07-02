import {
    isDbDataModified
} from '@server/utils/compareUtils.js';
import type {
    
} from '@server/types/index.js';

describe('Utils Unit Tests - Модуль Compare Utils', () => {
    // ==========================================
    // isDbDataModified
    // ==========================================
    
    describe('Функция isDbDataModified', () => {
        // null и undefined
        it('должна возвращать false, если старые и новые данные отсутствуют', () => {
            expect(isDbDataModified(undefined, undefined)).toBe(false);
        });

        it('должна возвращать true, если старые данные null, а новые отсутствуют (удаление из БД)', () => {
            expect(isDbDataModified(null, undefined)).toBe(true);
        });

        it('должна возвращать значение preserveNull, если старые данные отсутствуют, а новые null', () => {
            expect(isDbDataModified(undefined, null)).toBe(false);
            expect(isDbDataModified(undefined, null, { preserveNull: false })).toBe(false);
            expect(isDbDataModified(undefined, null, { preserveNull: true })).toBe(true);
        });

        it('должна возвращать обратное значение preserveNull, если старые и новые данные null', () => {
            expect(isDbDataModified(null, null)).toBe(true);
            expect(isDbDataModified(null, null, { preserveNull: false })).toBe(true);
            expect(isDbDataModified(null, null, { preserveNull: true })).toBe(false);
        });

        // Примитивы
        it('должна корректно сравнивать примитивы в данных', () => {
            expect(isDbDataModified(123, 123)).toBe(false);
            expect(isDbDataModified(123, 456)).toBe(true);
            expect(isDbDataModified('abc', 'abc')).toBe(false);
            expect(isDbDataModified('abc', 'def')).toBe(true);
            expect(isDbDataModified(true, true)).toBe(false);
            expect(isDbDataModified(false, true)).toBe(true);
        });

        // Даты
        it('должна возвращать true, если одни данные дата, а вторые нет', () => {
            expect(isDbDataModified(new Date(), 'abc')).toBe(true);
            expect(isDbDataModified(10, new Date())).toBe(true);
            expect(isDbDataModified('2026-06-27', null)).toBe(true);
            expect(isDbDataModified(undefined, '2026-06-27')).toBe(true);
            expect(isDbDataModified([undefined, true, {}], '2026-06-27')).toBe(true);
        });

        it('должна возвращать true, если данные дата и хотя бы одна из них не валидна', () => {
            const validDate = new Date(2026, 5, 27);
            const invalidDate = new Date('abc');

            expect(isDbDataModified(validDate, invalidDate)).toBe(true);
            expect(isDbDataModified(invalidDate, validDate)).toBe(true);
            expect(isDbDataModified(invalidDate, invalidDate)).toBe(true);
        });

        it('должна сравнивать валидные даты и возвращать true при их отличии и false при совпадении', () => {
            const date1 = new Date(2026, 5, 27);
            const date2 = new Date(2026, 5, 28);

            expect(isDbDataModified(date1, date2)).toBe(true);
            expect(isDbDataModified(date1, date1)).toBe(false);
        });

        // Массивы
        it('должна возвращать true, если одни данные массив, а вторые нет', () => {
            expect(isDbDataModified([], 'abc')).toBe(true);
            expect(isDbDataModified(123, ['abc'])).toBe(true);
            expect(isDbDataModified([123, 'abc'], null)).toBe(true);
            expect(isDbDataModified(undefined, [new Date(), null])).toBe(true);
        });

        it('должна возвращать true, если данные - массивы разной длины', () => {
            expect(isDbDataModified([], ['abc'])).toBe(true);
            expect(isDbDataModified([123, 456], [123])).toBe(true);
            expect(isDbDataModified([undefined], [new Date(), null, undefined])).toBe(true);
        });

        it('должна корректно сравнивать массивы одинаковой длины', () => {
            const date = new Date();
            const arrPrimitives1 = [1, 'a', true, date, undefined, null];
            const arrPrimitives2 = [1, 'a', false, date, undefined, null];

            // Проверка массивов ПРИМИТИВОВ (preserveNull должен игнорироваться, null === null -> false)
            expect(isDbDataModified(arrPrimitives1, [...arrPrimitives1], { preserveNull: false })).toBe(false);
            expect(isDbDataModified(arrPrimitives1, [...arrPrimitives1], { preserveNull: true })).toBe(false);
            expect(isDbDataModified(arrPrimitives1, arrPrimitives2)).toBe(true);

            // Проверка массивов ОБЪЕКТОВ (оригинальный флаг preserveNull прокидывается внутрь)
            const arrObjectsOld = [{ id: '1', discount: undefined }];
            const arrObjectsNew = [{ id: '1', discount: null }];

            // Если preserveNull = false, то null превращается в undefined -> изменений нет
            expect(isDbDataModified(arrObjectsOld, arrObjectsNew, { preserveNull: false })).toBe(false);
            
            // Если preserveNull = true, то null заменяет undefined -> есть изменение
            expect(isDbDataModified(arrObjectsOld, arrObjectsNew, { preserveNull: true })).toBe(true);
            
            // Сравнение пустых массивов
            expect(isDbDataModified([], [])).toBe(false);
        });

        // Объекты
        it(
            'должна возвращать false, если старые данные отсутствуют, а новые - пустой объект, ' +
            'и true, если новый объект не пустой или старые данные примитив',
            () => {
                expect(isDbDataModified(undefined, {})).toBe(false);
                expect(isDbDataModified(undefined, { field: null }, { preserveNull: false })).toBe(false);
                expect(isDbDataModified(undefined, { field: null }, { preserveNull: true })).toBe(true);
                expect(isDbDataModified(null, {})).toBe(true);
                expect(isDbDataModified(123, {})).toBe(true);
                expect(isDbDataModified('abc', {})).toBe(true);
            }
        );

        it('должна возвращать true, если старые данные объект, а новые - примитив', () => {
            expect(isDbDataModified({}, 123)).toBe(true);
            expect(isDbDataModified({}, 'abc')).toBe(true);
            expect(isDbDataModified({}, false)).toBe(true);
            expect(isDbDataModified({}, null)).toBe(true);
            expect(isDbDataModified({}, undefined)).toBe(true);
        });

        it(
            'должна возвращать false, если данные - объекты и все поля совпадают, ' +
            'и true, если есть хотя бы одно отличие в наличии или значении любого поля',
            () => {
                expect(isDbDataModified({}, {})).toBe(false);
                expect(isDbDataModified(
                    { a: 1, b: null },
                    { a: 1, b: null },
                    { preserveNull: false }
                )).toBe(true);
                expect(isDbDataModified(
                    { a: 1, b: null },
                    { a: 1, b: null },
                    { preserveNull: true }
                )).toBe(false);
                expect(isDbDataModified(
                    { a: 1, b: [2, null, 'b'] },
                    { a: 1, b: [2, null, 'b'] }
                )).toBe(false);
                expect(isDbDataModified(
                    { a: 1, b: [2, null, 'b'] },
                    { a: 1, b: [2, null, 'c'] }
                )).toBe(true);
            }
        );
    });
});
