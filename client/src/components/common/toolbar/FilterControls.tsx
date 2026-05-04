import { useMemo, useState } from 'react';
import cn from 'classnames';
import { logToolbarMissingProps } from '@/helpers/toolbarHelpers.js';
import { getInitFilterParams } from '@/helpers/urlParamsHelper.js';
import { formatDateOnly, isObjectsEqual } from '@shared/commonHelpers.js';
import { MAX_DATE_TS } from '@shared/constants.js';
import type { JSX, Dispatch, SetStateAction, ChangeEvent, FocusEvent, KeyboardEvent } from 'react';
import type { TFilterParamsClient, TFilterOption } from '@shared/types/index.js';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

interface IFilterControlsProps {
    filter?: TFilterParamsClient;
    setFilter?: Dispatch<SetStateAction<TFilterParamsClient>>;
    options?: readonly TFilterOption[];
    uiBlocked?: boolean;
}

interface IHandleInputChangeParams {
    type: TFilterOption['type'];
    minValue?: string;
    maxValue?: string;
    paramName: keyof TFilterParamsClient;
}

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

export default function FilterControls({
    filter,
    setFilter,
    options,
    uiBlocked = false
}: IFilterControlsProps): JSX.Element | null {
    if (filter == null || setFilter == null || options == null) {
        logToolbarMissingProps('FilterControls', { filter, setFilter, options });
        return null; 
    }

    const initFilterParams = useMemo(() => getInitFilterParams(null, options), []);

    const [filterParams, setFilterParams] = useState(filter);
    const [isSettingsVisible, setIsSettingsVisible] = useState(false);

    const isFilterChanged = !isObjectsEqual(filterParams, filter);
    const isFilterReseted = isObjectsEqual(filterParams, initFilterParams);

    const calcNumberInputWidth = (minLimit?: number, maxLimit?: number): string => {
        const MAX_WIDTH_CH = 12;
        if (minLimit === undefined || maxLimit === undefined) return MAX_WIDTH_CH + 'ch';

        const numberInputWidth = Math.max(String(minLimit).length, String(maxLimit).length) + 3;
        return Math.min(numberInputWidth, MAX_WIDTH_CH) + 'ch';
    };

    const handleInputChange = (
        e: ChangeEvent<HTMLInputElement> | FocusEvent<HTMLInputElement> | KeyboardEvent<HTMLInputElement>,
        params: IHandleInputChangeParams
    ): void => {
        const { type, minValue = '', maxValue = '', paramName } = params;

        const currentValue = e.currentTarget.value;
        let newValue = currentValue;

        if (currentValue !== '') {
            if (type === 'number' && ['blur', 'keydown'].includes(e.type)) {
                const num = Number(currentValue);
                const minValueNum = minValue !== '' ? Number(minValue) : -Infinity;
                const maxValueNum = maxValue !== '' ? Number(maxValue) : Infinity;
    
                if (num < minValueNum) {
                    newValue = String(minValueNum);
                } else if (num > maxValueNum) {
                    newValue = String(maxValueNum);
                }
            } else if (type === 'date') {
                const date = new Date(currentValue);
                const minDate = minValue !== '' ? new Date(minValue) : new Date(-MAX_DATE_TS);
                const maxDate = maxValue !== '' ? new Date(maxValue) : new Date(MAX_DATE_TS);
    
                if (date.getTime() < minDate.getTime()) {
                    newValue = formatDateOnly(minDate);
                } else if (date.getTime() > maxDate.getTime()) {
                    newValue = formatDateOnly(maxDate);
                }
            }
        }

        setFilterParams(prevFilterParams => {
            if (prevFilterParams[paramName] === newValue) {
                return prevFilterParams; // Исключает ререндер, если состояние не изменилось
            }

            const nextFilterParams = { ...prevFilterParams, [paramName]: newValue };
            return nextFilterParams;
        });
    };

    const renderOption = (option: TFilterOption, idx: number): JSX.Element => {
        const { label: optionLabel, type } = option;

        switch (type) {
            case 'number': {
                const { minLimit, maxLimit, minParamName, maxParamName } = option;
                const minLimitStr = minLimit !== undefined ? String(minLimit) : '';
                const maxLimitStr = maxLimit !== undefined ? String(maxLimit) : '';

                return (
                    <div key={idx} className={`filter-option ${type}-type`}>
                        <label className="option-label">{optionLabel}:</label>

                        <div className="option-values option-range">
                            <div className="range-field range-from">
                                <label htmlFor={`range-from-${idx}`} className="range-prefix">От</label>

                                <input
                                    id={`range-from-${idx}`}
                                    type={type}
                                    style={{ width: calcNumberInputWidth(minLimit, maxLimit) }}
                                    value={filterParams[minParamName] ?? minLimitStr}
                                    min={minLimitStr}
                                    max={maxLimitStr}
                                    onChange={e => handleInputChange(e, {
                                        type,
                                        paramName: minParamName
                                    })}
                                    onBlur={e => handleInputChange(e, {
                                        type,
                                        minValue: minLimitStr,
                                        maxValue: filterParams[maxParamName] ?? maxLimitStr,
                                        paramName: minParamName
                                    })}
                                    onKeyDown={e => e.key === 'Enter' && handleInputChange(e, {
                                        type,
                                        minValue: minLimitStr,
                                        maxValue: filterParams[maxParamName] ?? maxLimitStr,
                                        paramName: minParamName
                                    })}
                                />
                            </div>
                            
                            <span className="range-separator">–</span>

                            <div className="range-field range-to">
                                <label htmlFor={`range-to-${idx}`} className="range-prefix">до</label>

                                <input
                                    id={`range-to-${idx}`}
                                    type={type}
                                    style={{ width: calcNumberInputWidth(minLimit, maxLimit) }}
                                    value={filterParams[maxParamName] ?? maxLimitStr}
                                    min={minLimitStr}
                                    max={maxLimitStr}
                                    onChange={e => handleInputChange(e, {
                                        type,
                                        paramName: maxParamName
                                    })}
                                    onBlur={e => handleInputChange(e, {
                                        type,
                                        minValue: filterParams[minParamName] ?? minLimitStr,
                                        maxValue: maxLimitStr,
                                        paramName: maxParamName
                                    })}
                                    onKeyDown={e => e.key === 'Enter' && handleInputChange(e, {
                                        type,
                                        minValue: filterParams[minParamName] ?? minLimitStr,
                                        maxValue: maxLimitStr,
                                        paramName: maxParamName
                                    })}
                                />
                            </div>
                        </div>
                    </div>
                );
            }

            case 'date': {
                const { minLimit, maxLimit, minParamName, maxParamName } = option;
                const minLimitStr = formatDateOnly(minLimit);
                const maxLimitStr = formatDateOnly(maxLimit);
                
                return (
                    <div key={idx} className={`filter-option ${type}-type`}>
                        <label className="option-label">{optionLabel}:</label>

                        <div className="option-values option-range">
                            <div className="range-field range-from">
                                <label htmlFor={`range-from-${idx}`} className="range-prefix">С</label>
                                
                                <input
                                    id={`range-from-${idx}`}
                                    type={type}
                                    value={filterParams[minParamName] ?? minLimitStr}
                                    onChange={e => handleInputChange(e, {
                                        type,
                                        minValue: minLimitStr,
                                        maxValue: filterParams[maxParamName] ?? maxLimitStr,
                                        paramName: minParamName
                                    })}
                                />
                            </div>

                            <span className="range-separator">–</span>

                            <div className="range-field range-to">
                                <label htmlFor={`range-to-${idx}`} className="range-prefix">по</label>
                                
                                <input
                                    id={`range-to-${idx}`}
                                    type={type}
                                    value={filterParams[maxParamName] ?? maxLimitStr}
                                    onChange={e => handleInputChange(e, {
                                        type,
                                        minValue: filterParams[minParamName] ?? minLimitStr,
                                        maxValue: maxLimitStr,
                                        paramName: maxParamName
                                    })}
                                />
                            </div>
                        </div>
                    </div>
                );
            }

            case 'boolean': {
                const { paramName } = option;

                const booleanValueLabelEntries = [
                    ['', 'Не учитывать'],
                    ['true', 'Включить'],
                    ['false', 'Исключить']
                ] as const;

                return (
                    <div key={idx} className={`filter-option ${type}-type`}>
                        <label className="option-label">{optionLabel}:</label>

                        <div className="option-values">
                            {booleanValueLabelEntries.map(([value, label]) => (
                                <label key={`${paramName}-${value}`} className="label-radio-btn">
                                    <input
                                        type="radio"
                                        name={paramName}
                                        value={value}
                                        checked={filterParams[paramName] === value}
                                        onChange={e => handleInputChange(e, { type, paramName })}
                                    />
                                    <span className="designed-radio-btn"></span>
                                    <span>{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            }

            case 'string':
            default: {
                const { paramName, valueOptions } = option;

                return (
                    <div key={idx} className={`filter-option ${type}-type`}>
                        <label className="option-label">{optionLabel}:</label>

                        <div className="option-values">
                            {valueOptions.map(({ value, label }) => (
                                <label key={`${paramName}-${value}`} className="label-radio-btn">
                                    <input
                                        type="radio"
                                        name={paramName}
                                        value={value}
                                        checked={filterParams[paramName] === value}
                                        onChange={e => handleInputChange(e, { type, paramName })}
                                    />
                                    <span className="designed-radio-btn"></span>
                                    <span>{label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                );
            }
        }
    };

    return (
        <div className="filter-controls">
            <button
                className={cn('filter-settings-btn', isSettingsVisible ? 'enabled' : null)}
                onClick={() => setIsSettingsVisible(prev => !prev)}
            >
                Настройка фильтра
            </button>

            <div className={cn('filter-settings', isSettingsVisible ? 'enabled' : null)}>
                {options.map(renderOption)}

                <div className="filter-actions">
                    <button
                        className="filter-btn"
                        onClick={() => setFilter(filterParams)}
                        disabled={uiBlocked || !isFilterChanged}
                    >
                        Отфильтровать
                    </button>
                    
                    <button
                        className="reset-filter-btn"
                        onClick={() => setFilterParams(initFilterParams)}
                        disabled={isFilterReseted}
                    >
                        Сбросить фильтр
                    </button>
                </div>
            </div>
        </div>
    );
}
