import { createDefaultEsmPreset } from 'ts-jest';

const tsJestPreset = createDefaultEsmPreset();

/** @type {import('jest').Config} */
export default {
    testEnvironment: 'node',
    ...tsJestPreset,
    verbose: true,
    setupFiles: ['<rootDir>/jest.setup.js'],
    moduleNameMapper: {
        // Алиасы путей (расширение в конце импорта - .js, .ts, .jsx, .tsx ИЛИ отсутствует)
        '^@/(.*?)(\\.(js|jsx|ts|tsx))?$': '<rootDir>/client/src/$1',
        '^@server/(.*?)(\\.(js|ts))?$': '<rootDir>/server/$1',
        '^@shared/(.*?)(\\.(js|ts))?$': '<rootDir>/shared/$1',

        // Локальный поиск для относительных импортов внутри папок
        '^\\.(.*)\\.(js|jsx|ts|tsx)$': '.$1'
    }
};
