import { jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import PaginationPages from '@/components/common/toolbar/PaginationPages.jsx';

describe('PaginationPages Component', () => {
    // Заготовка фейковой функции-шпиона
    const mockSetPage = jest.fn();

    // Базовые пропсы для тестов: 50 товаров при лимите 10 дадут 5 страниц
    const defaultProps = {
        currentPage: 2,
        totalItems: 50,
        limit: 10,
        setPage: mockSetPage,
        initDataReady: true,
        uiBlocked: false
    };

    // Хелпер нахождения элементов по aria-label или тексту содержимого для вызова при ререндере
    const setupElements = () => ({
        prevBtn: screen.getByRole('button', { name: /перейти на предыдущую страницу/i }),
        nextBtn: screen.getByRole('button', { name: /перейти на следующую страницу/i }),
        page1Btn: screen.getByRole('button', { name: /перейти на страницу 1/i }),
        page5Btn: screen.getByRole('button', { name: /перейти на страницу 5/i }),
        selectPageBtn: screen.getByRole('button', { name: /перейти на выбранную страницу/i })
    });

    // Очистка функции-шпиона перед каждым тестом, чтобы вызовы не копились
    beforeEach(() => {
        mockSetPage.mockClear();
    });

    it('должен правильно рендерить и блокировать кнопки страниц', () => {
        // Тест случая для ПЕРВОЙ страницы
        const { rerender } = render(<PaginationPages {...defaultProps} currentPage={1} />);

        // Нахождение по aria-label и проверка активности кнопок пагинации
        let elems = setupElements();

        expect(elems.prevBtn).toBeDisabled();
        expect(elems.nextBtn).not.toBeDisabled();
        expect(elems.page1Btn).toBeDisabled();
        expect(elems.page5Btn).not.toBeDisabled();
        expect(elems.selectPageBtn).toBeDisabled();

        // Тест случая для ПОСЛЕДНЕЙ (5-й) страницы
        rerender(<PaginationPages {...defaultProps} currentPage={5} />);

        elems = setupElements();
        
        expect(elems.prevBtn).not.toBeDisabled();
        expect(elems.nextBtn).toBeDisabled();
        expect(elems.page1Btn).not.toBeDisabled();
        expect(elems.page5Btn).toBeDisabled();
        expect(elems.selectPageBtn).toBeDisabled();
    });

    it('должен вызывать setPage с правильным номером при клике на кнопку страницы', async () => {
        render(<PaginationPages {...defaultProps} currentPage={2} />);
        
        // Инициализация userEvent для эмуляции действий пользователя
        const user = userEvent.setup();

        // Нахождение кнопки страницы "3"
        const page3Btn = screen.getByRole('button', { name: /перейти на страницу 3/i });

        // Клик по кнопке
        await user.click(page3Btn);

        // Проверка, что наша функция-шпион была вызвана ровно 1 раз и именно с цифрой 3
        expect(mockSetPage).toHaveBeenCalledTimes(1);
        expect(mockSetPage).toHaveBeenCalledWith(3);
    });

    it('должен менять значение в инпуте и переходить на страницу по нажатию Enter', async () => {
        render(<PaginationPages {...defaultProps} currentPage={2} />);

        const user = userEvent.setup();
        const selectPageInput = screen.getByLabelText(/на страницу:/i); // Инпут выбора страницы

        await user.clear(selectPageInput); // Очистка поля инпута
        await user.type(selectPageInput, '4'); // Ввод числа "4" в инпут

        expect(selectPageInput).toHaveValue(4); // Проверка состояния инпута: введено числовое значение "4"

        await user.type(selectPageInput, '{enter}'); // Имитация нажатия Enter на инпуте

        expect(mockSetPage).toHaveBeenCalledTimes(1);
        expect(mockSetPage).toHaveBeenCalledWith(4);
    });
});
