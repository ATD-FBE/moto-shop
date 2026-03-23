import { allowedConfigTypes } from '@server/utils/multerConfig.js';
import type { TMulterMode } from './config.types.js';
import type { TAllowedMimeType } from '@shared/types/index.js';

export interface IMulterErrorContext {
    field: string;
    filesLimit: number;
    maxSizeMB: number;
    message: string;
}

export interface IMulterErrorSpec {
    type: string;
    message: string;
}

export interface IMulterField {
    name: string;
    maxCount?: number;
}

export interface IMulterConfigArgs {
    type: typeof allowedConfigTypes[number];
    fields: 
        | string               // Для 'single' и простого 'array'
        | IMulterField         // Для 'array' с лимитом
        | IMulterField[];      // Для 'fields' (массив объектов)
    storageMode?: TMulterMode;
    storagePath?: string | null;
    allowedMimeTypes: readonly TAllowedMimeType[];
    filesLimit?: number;
    maxSizeMB: number;
}

export interface IExtendedError extends Error {
    isMulterError?: boolean;
    code?: string;
    field?: string;
}
