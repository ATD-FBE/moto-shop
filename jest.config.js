import { createDefaultEsmPreset } from 'ts-jest';

const tsJestPreset = createDefaultEsmPreset();

const commonProjectConfig = {
    ...tsJestPreset,
    moduleNameMapper: {
        // Алиасы путей (расширение в конце импорта - .js, .ts, .jsx, .tsx ИЛИ отсутствует)
        '^@/(.*?)(\\.(js|jsx|ts|tsx))?$': '<rootDir>/client/src/$1',
        '^@server/(.*?)(\\.(js|ts))?$': '<rootDir>/server/$1',
        '^@shared/(.*?)(\\.(js|ts))?$': '<rootDir>/shared/$1',

        // Локальный поиск для относительных импортов внутри папок
        '^\\.(.*)\\.(js|jsx|ts|tsx)$': '.$1'
    }
};

/** @type {import('jest').Config} */
export default {
    verbose: true,
    projects: [
        {
            displayName: 'server',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/server/__tests__/**/*.[jt]s?(x)'],
            setupFiles: ['<rootDir>/jest.setup.server.js'],
            ...commonProjectConfig
        },
        {
            displayName: 'client',
            testEnvironment: 'jsdom', // Виртуальный браузер для фронта
            testMatch: ['<rootDir>/client/src/__tests__/**/*.[jt]s?(x)'],
            setupFilesAfterEnv: ['<rootDir>/jest.setup.client.js'],
            ...commonProjectConfig
        },
        {
            displayName: 'shared',
            testEnvironment: 'node',
            testMatch: ['<rootDir>/shared/__tests__/**/*.[jt]s?(x)'],
            ...commonProjectConfig
        }
    ]
};
