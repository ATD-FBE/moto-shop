import { createElement } from 'react';
import { padTwoDigits, escapeRegExp } from '@shared/commonHelpers.js';
import { NO_VALUE_LABEL } from '@/config/constants.js';
import type { ReactNode } from 'react';

export const formatLocalDate = (
    date: Date | string | number | null | undefined,
    format: Intl.DateTimeFormatOptions = {}
): string => {
    if (!date) return NO_VALUE_LABEL;

    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return NO_VALUE_LABEL;

    return d.toLocaleString(undefined, format);
};

export const formatMoscowDate = (date: Date | string | number | null | undefined): string => {
    if (!date) return NO_VALUE_LABEL;

    const d = date instanceof Date ? date : new Date(date);
    if (isNaN(d.getTime())) return NO_VALUE_LABEL;

    const moscowDate = new Date(d.toLocaleString('en-US', { timeZone: 'Europe/Moscow' }));

    const year = moscowDate.getFullYear();
    const month = padTwoDigits(moscowDate.getMonth() + 1);
    const day = padTwoDigits(moscowDate.getDate());
    const hours = padTwoDigits(moscowDate.getHours());
    const minutes = padTwoDigits(moscowDate.getMinutes());
    const seconds = padTwoDigits(moscowDate.getSeconds());

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds} MSK`;
};

export const capitalizeFirstLetter = (str: string): string => str.charAt(0).toUpperCase() + str.slice(1);

export const toKebabCase = (str: string): string => str.replace(/([A-Z])/g, '-$1').toLowerCase();

export const pluralize = (
    count: number,
    [one, few, many]: [string, string, string]
): string => {
    const mod10 = count % 10;
    const mod100 = count % 100;
    
    if (mod10 === 1 && mod100 !== 11) return one;
    if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
    return many;
};

export const formatListWithConjunction = (list: string[], conjunction: string = 'и'): string => {
    if (list.length === 0) return '';
    if (list.length === 1) return list[0] ?? '';
    
    const last = list.pop() ?? '';
    return `${list.join(', ')} ${conjunction} ${last}`;
};

export const joinItemsWithQuotes = (items: string[]): string => items.map(i => `"${i}"`).join(', ');

export const joinItemsWithChevrons = (items: string[]): string => items.map(i => `«${i}»`).join(', ');

export const highlightText = (text: string, query?: string): ReactNode[] => {
    const trimmedQuery = query?.trim();
    if (!trimmedQuery) return [text];
  
    const safeQuery = escapeRegExp(trimmedQuery);
    const regex = new RegExp(`(${safeQuery})`, 'ig');
    const textParts = text.split(regex);

    const lowerQuery = trimmedQuery.toLowerCase();
  
    return textParts.map((part, idx) => {
        if (part.toLowerCase() === lowerQuery) {
            return createElement('mark', { 
                key: idx, 
                className: 'highlighted-text' 
            }, part);
        }

        return part;
    });
};

export const getFieldInfoClass = (elem: string, type: string | undefined, name: string): string => {
    return `${elem}${type ? '-' + type : ''}-elem ${toKebabCase(name)}-field`;
};

export const formatCurrency = (amount: unknown): string => {
    if (typeof amount !== 'number' || isNaN(amount)) return NO_VALUE_LABEL;
    
    return new Intl.NumberFormat('ru-RU', {
        style: 'decimal',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
};

export const formatProductTitle = (name?: string, brand?: string): string => {
    return `${name ?? ''}${brand ? ` ${joinItemsWithChevrons([brand])}`: ''}`;
};
