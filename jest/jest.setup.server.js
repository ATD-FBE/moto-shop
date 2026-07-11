import path from 'path';
import dotenv from 'dotenv';

// Чистка ненужных логов в консоли
const originalLog = console.log;

console.log = (...args) => {
    // Если в аргументах лога есть сигнатура dotenv — игнорирование лога
    if (typeof args[0] === 'string' && args[0].includes('injected env')) {
        return;
    }

    // Все остальные логи из тестов будут выводиться как обычно
    originalLog(...args);
};

// Установка переменных окружения для теста
const devEnvPath = path.resolve(process.cwd(), 'server', 'config', '.env.test');
dotenv.config({ path: devEnvPath });
