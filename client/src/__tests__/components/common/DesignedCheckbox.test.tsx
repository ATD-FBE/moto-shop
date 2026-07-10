import { jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import DesignedCheckbox from '@/components/common/DesignedCheckbox.jsx';

describe('Компонент DesignedCheckbox', () => {
    const mockOnChange = jest.fn();
    const mockOnBlur = jest.fn();

    const defaultProps = {
        label: 'Checkbox Label',
        checkIcon: '✓'
    };

    const setupElements = () => ({
        checkboxInput: screen.getByRole('checkbox', { name: new RegExp(defaultProps.label, 'i') }),
        checkboxSpan: screen.getByTestId('designed-checkbox-view'),
        labelLeftSpan: screen.queryByText(`${defaultProps.label}:`), // Опциональный элемент -> query*
        labelRightSpan: screen.queryByText(defaultProps.label), // Опциональный элемент -> query*
        iconSpan: screen.getByText(defaultProps.checkIcon)
    });

    beforeEach(() => {
        mockOnChange.mockClear();
        mockOnBlur.mockClear();
    });

    it('должен правильно рендерить элементы компонента в зависимости от расположения лэйбла', () => {
        const { rerender } = render(<DesignedCheckbox {...defaultProps} labelSide="left" checked={false} />);
        let elems = setupElements();

        expect(elems.checkboxInput).toBeInTheDocument();
        expect(elems.checkboxSpan).toBeInTheDocument();
        expect(elems.labelLeftSpan).toBeInTheDocument();
        expect(elems.labelRightSpan).toBeNull();
        expect(elems.iconSpan).toBeInTheDocument();

        rerender(<DesignedCheckbox {...defaultProps} labelSide="right" checked={true} />);
        elems = setupElements();

        expect(elems.checkboxInput).toBeInTheDocument();
        expect(elems.checkboxSpan).toBeInTheDocument();
        expect(elems.labelLeftSpan).toBeNull();
        expect(elems.labelRightSpan).toBeInTheDocument();
        expect(elems.iconSpan).toBeInTheDocument();
    });

    it('должен правильно обрабатывать состояние доступности', () => {
        const { rerender } = render(<DesignedCheckbox {...defaultProps} disabled={true} />);
        let elems = setupElements();
    
        expect(elems.checkboxInput).toBeDisabled();
        expect(elems.checkboxSpan).toHaveAttribute('tabIndex', '-1');
    
        rerender(<DesignedCheckbox {...defaultProps} disabled={false} />);
        elems = setupElements();
    
        expect(elems.checkboxInput).not.toBeDisabled();
        expect(elems.checkboxSpan).toHaveAttribute('tabIndex', '0');
    });

    it('должен правильно обрабатывать состояние выбора', () => {
        const { rerender } = render(<DesignedCheckbox {...defaultProps} checked={true} />);
        let elems = setupElements();
    
        expect(elems.checkboxInput).toBeChecked();
        expect(elems.iconSpan).toHaveClass('visible');
    
        rerender(<DesignedCheckbox {...defaultProps} checked={false} />);
        elems = setupElements();
    
        expect(elems.checkboxInput).not.toBeChecked();
        expect(elems.iconSpan).not.toHaveClass('visible');
    });

    it('должен устанавливать фокус на чекбокс-спэне при кликах', async () => {
        const { rerender } = render(<DesignedCheckbox {...defaultProps} labelSide="left" />);

        const user = userEvent.setup();
        const elems = setupElements();

        expect(elems.checkboxInput).not.toHaveFocus();
        expect(elems.checkboxSpan).not.toHaveFocus();
    
        // Проверка получения фокуса чекбокс-инпутом через полную имитацию клика по нему
        await user.click(elems.checkboxSpan);
        expect(elems.checkboxInput).toHaveFocus();

        // Проверка получения фокуса чекбокс-спэном через чистое событие клика
        rerender(<DesignedCheckbox {...defaultProps} labelSide="left" />);
        fireEvent.click(elems.labelLeftSpan!);
        expect(elems.checkboxSpan).toHaveFocus();
    });

    it('должен вызвать обработчик onChange при клике при передаче его в пропсах', async () => {
        render(<DesignedCheckbox {...defaultProps} onChange={mockOnChange} />);

        const user = userEvent.setup();
        const elems = setupElements();
    
        await user.click(elems.checkboxSpan);
        expect(mockOnChange).toHaveBeenCalledTimes(1);

        elems.checkboxSpan.focus();
        elems.checkboxSpan.blur();
        expect(mockOnBlur).not.toHaveBeenCalled();
    });

    it('должен вызвать обработчик onBlur при потере фокуса при передаче его в пропсах', () => {
        render(
            <DesignedCheckbox 
                {...defaultProps} 
                name="test-checkbox" 
                checked={true} 
                onBlur={mockOnBlur} 
            />
        );
        const elems = setupElements();
    
        elems.checkboxSpan.focus();
        elems.checkboxSpan.blur();

        expect(mockOnBlur).toHaveBeenCalledTimes(1);
        expect(mockOnBlur).toHaveBeenCalledWith(
            expect.objectContaining({
                currentTarget: {
                    name: 'test-checkbox',
                    type: 'checkbox',
                    value: 'on', // Дефолтное значение для чекбокса в HTML, если не передан value
                    checked: true
                }
            })
        )
    });

    it('должен корректно обработать нажатия клавиш Enter и Space на активном чекбокс-спэне', async () => {
        render(<DesignedCheckbox {...defaultProps} onChange={mockOnChange} />);

        const user = userEvent.setup();
        const elems = setupElements();

        // Установка и проверка фокуса
        elems.checkboxSpan.focus();
        expect(elems.checkboxSpan).toHaveFocus();
    
        // Проверка нажатия клавиши Enter
        await user.keyboard('{Enter}');
        expect(mockOnChange).toHaveBeenCalledTimes(1);

        // Проверка нажатия клавиши Space
        await user.keyboard(' ');
        expect(mockOnChange).toHaveBeenCalledTimes(2);
    });

    // Альтернативный вариант проверки клавиш через fireEvent
    it('должен корректно обработать нажатия клавиш Enter и Space на активном чекбокс-спэне', () => {
        render(<DesignedCheckbox {...defaultProps} onChange={mockOnChange} />);
        const elems = setupElements();
    
        // Проверка нажатия клавиши Enter
        fireEvent.keyDown(elems.checkboxSpan, { key: 'Enter' });
        expect(mockOnChange).toHaveBeenCalledTimes(1);
    
        // Проверка нажатия клавиши Space
        fireEvent.keyDown(elems.checkboxSpan, { key: ' ' });
        expect(mockOnChange).toHaveBeenCalledTimes(2);
    });

    it('не должен вызывать onChange при кликах или нажатии клавиш при недоступном чекбоксе', async () => {
        render(<DesignedCheckbox {...defaultProps} onChange={mockOnChange} disabled={true} />);
        
        const user = userEvent.setup();
        const elems = setupElements();

        // Симуляция клика через userEvent
        await user.click(elems.checkboxSpan);
        expect(mockOnChange).not.toHaveBeenCalled();

        // Симуляция нажатий клавиш через fireEvent, так как user.keyboard заблокирован из-за фокуса
        fireEvent.keyDown(elems.checkboxSpan, { key: 'Enter' });
        expect(mockOnChange).not.toHaveBeenCalled();

        fireEvent.keyDown(elems.checkboxSpan, { key: ' ' });
        expect(mockOnChange).not.toHaveBeenCalled();
    });
});
