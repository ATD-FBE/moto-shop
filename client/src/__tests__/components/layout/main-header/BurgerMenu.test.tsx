import { jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { assertDefined } from '@shared/commonHelpers.js';
import { USER_ROLE } from '@shared/constants.js';

jest.unstable_mockModule('@/components/layout/main-header/DashboardNav.jsx', () => ({
    default: function MockDashboardNav() {
        return <nav data-testid="dashboard-nav">Mocked Dashboard Nav</nav>;
    }
}));

const { default: BurgerMenu } = await import('@/components/layout/main-header/BurgerMenu.jsx');

describe('Компонент BurgerMenu', () => {
    const defaultProps = {
        userRole: USER_ROLE.CUSTOMER,
        navigationMap: {
            adminDashboard: [{ label: 'Home', paths: ['/'] }],
            customerDashboard: [{ label: 'Home', paths: ['/'] }]
        },
        setActiveClass: (): '' => '',
        setFeaturedClass: (): '' => ''
    };

    const setupElements = () => ({
        burgerContainerDiv: screen.getByTestId('burger-menu-container'),
        burgerBtn: screen.getByRole('button', { name: /меню/i }),
        burgerMenuContentDiv: screen.getByTestId('burger-menu-content'),
        dashboardNav: screen.queryByTestId('dashboard-nav')
    });

    it('должен правильно рендерить элементы компонента в зависимости от роли пользователя', () => {
        const { rerender } = render(<BurgerMenu {...defaultProps} userRole={USER_ROLE.GUEST} />);
        let elems = setupElements();

        expect(elems.burgerContainerDiv).toBeInTheDocument();
        expect(elems.burgerBtn).toBeInTheDocument();
        expect(elems.burgerMenuContentDiv).toBeInTheDocument();
        expect(elems.dashboardNav).toBeNull();

        rerender(<BurgerMenu {...defaultProps} userRole={USER_ROLE.CUSTOMER} />);
        elems = setupElements();

        expect(elems.burgerContainerDiv).toBeInTheDocument();
        expect(elems.burgerBtn).toBeInTheDocument();
        expect(elems.burgerMenuContentDiv).toBeInTheDocument();
        expect(elems.dashboardNav).toBeInTheDocument();
    });

    it('должен открывать меню по клику на кнопку и закрывать его при клике снаружи', async () => {
        render(<BurgerMenu {...defaultProps} />);
        const user = userEvent.setup();
        const elems = setupElements();

        expect(elems.burgerContainerDiv).not.toHaveClass('menu-open');
        expect(elems.burgerBtn).toHaveAttribute('aria-expanded', 'false');

        // Тест клика по кнопке (открывает меню)
        await user.click(elems.burgerBtn);

        expect(elems.burgerContainerDiv).toHaveClass('menu-open');
        expect(elems.burgerBtn).toHaveAttribute('aria-expanded', 'true');

        // Тест клика по телу HTML-документа (закрывает меню)
        await user.click(document.body);

        expect(elems.burgerContainerDiv).not.toHaveClass('menu-open');
        expect(elems.burgerBtn).toHaveAttribute('aria-expanded', 'false');
    });

    it('должен корректно размонтировать компонент и удалять слушателей на нём', async () => {
        const addSpy = jest.spyOn(document, 'addEventListener');
        const removeSpy = jest.spyOn(document, 'removeEventListener');

        const { unmount } = render(<BurgerMenu {...defaultProps} />);
        const user = userEvent.setup();
        const elems = setupElements();

        // Клик по кнопке открывает меню и устанавливает слушатель
        await user.click(elems.burgerBtn);
        expect(addSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

        // Поиск нужного обработчика для проверки удаления именно слушателя с ним
        const targetHandler = addSpy.mock.calls.find(call => call[0] === 'mousedown')?.[1];
        expect(targetHandler).toBeDefined();
        assertDefined(targetHandler, 'targetHandler');

        // Имитация размонтирования компонента и проверка эффектов
        unmount();
        expect(elems.burgerContainerDiv).not.toBeInTheDocument();
        expect(removeSpy).toHaveBeenCalledWith('mousedown', targetHandler);

        // Чистка шпионов
        addSpy.mockRestore();
        removeSpy.mockRestore();
    });
});
