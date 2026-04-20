import { useRef } from 'react';
import cn from 'classnames';
import type { JSX, InputHTMLAttributes, FocusEvent, KeyboardEvent } from 'react';

interface IDesignedCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onBlur'> {
    label?: string;
    labelSide?: 'left' | 'right';
    showColon?: boolean;
    checkIcon?: string;
    checkIconColor?: 'blue' | 'red' | 'green';
    onBlur?: (e: FocusEvent<HTMLSpanElement>) => void; // Переопределение blur для span
}

export default function DesignedCheckbox({
    id,
    name = 'checkbox',
    label = '',
    labelSide = 'left',
    showColon = true,
    checkIcon = '✓',
    checkIconColor = 'blue',
    checked = false,
    onChange,
    onBlur,
    disabled = false,
    ...rest
}: IDesignedCheckboxProps): JSX.Element {
    const inputRef = useRef<HTMLInputElement | null>(null);

    const handleKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault(); // Чтобы пробел не скроллил страницу
            inputRef.current?.click();
        }
    };

    return (
        <label className="designed-checkbox-container">
            {label && labelSide === 'left' &&
                <span className="checkbox-label left-side">
                    {label}{showColon && ':'}
                </span>}

            <input
                ref={inputRef}
                {...rest}
                id={id}
                name={name}
                type="checkbox"
                checked={checked}
                onChange={onChange}
                disabled={disabled}
            />

            <span
                className="designed-checkbox"
                tabIndex={disabled ? -1 : 0}
                onKeyDown={handleKeyDown}
                onBlur={onBlur}
            >
                <span
                    className={cn('check-icon', `color-${checkIconColor}`, { 'visible': checked })}
                    aria-hidden="true"
                >
                    {checkIcon}
                </span>
            </span>

            {label && labelSide === 'right' &&
                <span className="checkbox-label right-side">
                    {label}{showColon && ':'}
                </span>}
        </label>
    );
}
