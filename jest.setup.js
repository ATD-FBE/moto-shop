import dotenv from 'dotenv';
import path from 'path';

const originalLog = console.log;

console.log = (...args) => {
    // Если в аргументах лога есть сигнатура dotenv — игнорирование лога
    if (typeof args[0] === 'string' && args[0].includes('injected env')) {
        return;
    }

    // Все остальные логи из тестов будут выводиться как обычно
    originalLog(...args);
};

const envFile = process.env.CI ? '.env.test' : '.env.development'; // CI - Тест на GitHub
const devEnvPath = path.resolve(process.cwd(), 'server', 'config', envFile);
dotenv.config({ path: devEnvPath });
