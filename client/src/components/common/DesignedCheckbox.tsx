import { useRef } from 'react';
import cn from 'classnames';
import type { JSX, InputHTMLAttributes, FocusEvent, KeyboardEvent } from 'react';

interface IDesignedCheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onBlur'> {
    label?: string;
    labelSide?: 'left' | 'right';
    showColon?: boolean;
    checkIcon?: string;
    checkIconColor?: 'blue' | 'red' | 'green';
    onBlur?: (e: FocusEvent<HTMLInputElement>) => void; // Переопределение blur для span
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
    const spanRef = useRef<HTMLSpanElement | null>(null);

    const handleSpanKeyDown = (e: KeyboardEvent<HTMLSpanElement>) => {
        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
        }
    };

    const handleSpanBlur = (e: FocusEvent<HTMLSpanElement>) => {
        if (!onBlur) return;

        const input = inputRef.current;
        if (!input) return;

        const fakeInputElementEvent = {
            ...e,
            currentTarget: {
                name: input.name,
                type: input.type,
                value: input.value,
                checked: input.checked
            }
        } as FocusEvent<HTMLInputElement>;

        onBlur(fakeInputElementEvent);
    };

    const handleLabelMouseDown = (e: React.MouseEvent<HTMLSpanElement>) => {
        e.preventDefault(); 
    };

    const handleLabelClick = () => {
        if (!disabled && spanRef.current) {
            spanRef.current.focus();
        }
    };

    return (
        <label className="designed-checkbox-container">
            {label && labelSide === 'left' &&
                <span
                    className="checkbox-label left-side"
                    onMouseDown={handleLabelMouseDown}
                    onClick={handleLabelClick}
                >
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
                ref={spanRef}
                className="designed-checkbox"
                tabIndex={disabled ? -1 : 0}
                onKeyDown={handleSpanKeyDown}
                onBlur={handleSpanBlur}
            >
                <span
                    className={cn('check-icon', `color-${checkIconColor}`, { 'visible': checked })}
                    aria-hidden="true"
                >
                    {checkIcon}
                </span>
            </span>

            {label && labelSide === 'right' &&
                <span
                    className="checkbox-label right-side"
                    onMouseDown={handleLabelMouseDown}
                    onClick={handleLabelClick}
                >
                    {label}{showColon && ':'}
                </span>}
        </label>
    );
}
