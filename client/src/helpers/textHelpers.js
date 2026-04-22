import { escapeRegExp } from '@shared/commonHelpers.js';
import { NO_VALUE_LABEL } from '@/config/constants.js';

export const formatLocalDate = (
    date/*: Date | string | number | null | undefined*/,
    format/*: Intl.DateTimeFormatOptions*/ = {}
)/*: string*/ => {
    if (!date) return NO_VALUE_LABEL;

    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return NO_VALUE_LABEL;
    return d.toLocaleString(undefined, format);
};
export const padTwoDigits = (n/*: number*/)/*: string*/ => String(n).padStart(2, '0');

export const formatDateOnly = (date/*: Date | string | number | null | undefined*/)/*: string*/ => {
    if (!date) return NO_VALUE_LABEL;
    
    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return NO_VALUE_LABEL;
    return `${d.getFullYear()}-${padTwoDigits(d.getMonth() + 1)}-${padTwoDigits(d.getDate())}`;
};

export const formatDateToMoscowLog = (date/*: Date*/)/*: string*/ => {
    const moscowDate = new Date(date.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));

    const year = moscowDate.getFullYear();
    const month = padTwoDigits(moscowDate.getMonth() + 1);
    const day = padTwoDigits(moscowDate.getDate());
    const hours = padTwoDigits(moscowDate.getHours());
    const minutes = padTwoDigits(moscowDate.getMinutes());
    const seconds = padTwoDigits(moscowDate.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} MSK`;
};

export const capitalizeFirstLetter = (str) => str.charAt(0).toUpperCase() + str.slice(1);

export const toKebabCase = (str) => str.replace(/([A-Z])/g, '-$1').toLowerCase();

export const pluralize = (count, [one, few, many]) => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
};

export const formatListWithConjunction = (list, conjunction = 'и') => {
    if (list.length === 0) return '';
    if (list.length === 1) return list[0];
    
    const last = list.pop();
    return `${list.join(', ')} ${conjunction} ${last}`;
};

export const joinItemsWithQuotes = (items) => items.map(i => `"${i}"`).join(', ');

export const joinItemsWithChevrons = (items) => items.map(i => `«${i}»`).join(', ');

export const highlightText = (text, query) => {
    if (!query?.trim()) return [text];
  
    const safeQuery = escapeRegExp(query.trim());
    const regex = new RegExp(`(${safeQuery})`, 'ig');
    const textParts = text.split(regex);
  
    return textParts.map((part, i) =>
        regex.test(part) ? <mark key={i} className="highlighted-text">{part}</mark> : part
    );
};

export const getFieldInfoClass = (elem, type, name) => {
    return `${elem}${type ? '-' + type : ''}-elem ${toKebabCase(name)}-field`;
};

export const getValidQuantity = (stringVal, min, max) => {
    const value = Number(stringVal);

    if (isNaN(value) || value < min) return min;
    if (value > max) return max;
    return Math.round(value);
};

export const formatCurrency = (amount) => {
    if (typeof amount !== 'number' || isNaN(amount)) return NO_VALUE_LABEL;
    
    return new Intl.NumberFormat('ru-RU', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

export const formatProductTitle = (name, brand) => {
    return `${name ?? ''}${brand ? ` ${joinItemsWithChevrons([brand])}`: ''}`;
};
