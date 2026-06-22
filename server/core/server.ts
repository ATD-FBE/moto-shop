import { setServers } from 'node:dns/promises';
import https from 'https';
import http from 'http';
import fs from 'fs';
import config from '@server/config/config.js';
import app from '@server/core/app.js';
import { connectMongoDB } from '@server/db/mongoDB.js';
import { disconnectMongoDB } from '@server/db/mongoDB.js';
import { startCronTasks, stopCronTasks } from '@server/services/cron/cronService.js';
import { storageService } from '@server/services/storage/storageService.js';
import { isCriticalError } from '@server/utils/errorUtils.js';
import log from '@server/utils/logger.js';
import { toError } from '@shared/commonHelpers.js';
import type { TShutdownSignal } from '@server/types/index.js';

setServers(['1.1.1.1', '8.8.8.8']);

const ENV = config.env;
const PROTOCOL = config.protocol;
const HOST = config.host;
const DOMAIN = config.domain;
const SERVER_PORT = config.serverPort;

const createServer = (protocol: string, host: string): http.Server | https.Server => {
    if (protocol === 'https' && ENV !== 'production') {
        const keyPath = `./certs/${host}-key.pem`;
        const certPath = `./certs/${host}.pem`;

        const options = {
            key: fs.readFileSync(keyPath),
            cert: fs.readFileSync(certPath)
        };

        return https.createServer(options, app);
    }
    
    return http.createServer(app);
};

const shutdown = async (
    signal: TShutdownSignal,
    server?: http.Server | https.Server
): Promise<void> => {
    log.info(`Получен сигнал: ${signal}. Начинаем Graceful Shutdown...`);

    // Остановка сервера
    if (server) {
        await new Promise<void>(resolve => {
            server.close(() => {
                log.info('HTTP/HTTPS сервер остановлен');
                resolve();
            });
        });
    }

    // Остановка фоновых задач
    stopCronTasks();

    // Закрытие базы данных
    await disconnectMongoDB();

    // Выход с соответствующим кодом
    const exitCode = ['SIGINT', 'SIGTERM'].includes(signal) ? 0 : 1;
    log.info(`Процесс завершен с кодом ${exitCode}`);
    process.exit(exitCode);
};

const startServer = async (): Promise<void> => {
    let server: http.Server | https.Server | undefined;

    try {
        // Создание сервера
        server = createServer(PROTOCOL, HOST);

        // Подключение процессов
        process.on('SIGINT', () => shutdown('SIGINT', server));
        process.on('SIGTERM', () => shutdown('SIGTERM', server));
        process.on('uncaughtException', (err) => {
            const error = toError(err);
            log.error('Uncaught exception:', error);
            if (isCriticalError(error)) shutdown('UNCAUGHT_EXCEPTION', server);
        });
        process.on('unhandledRejection', (reason: unknown) => {
            const error = toError(reason);
            log.error('Unhandled Rejection в коде:', error);
            if (isCriticalError(error)) shutdown('UNHANDLED_REJECTION', server);
        });

        // Подключение базы данных, инициализация хранилища и старт фоновых задач
        await connectMongoDB();
        await storageService.initStorage();
        startCronTasks();

        // Запуск сервера
        server.listen(SERVER_PORT, HOST, () => {
            log.info(`Сервер запущен по адресу: ${PROTOCOL}://${DOMAIN}:${SERVER_PORT}`);
        });

        server.on('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'EADDRINUSE') {
                log.error(`Порт ${SERVER_PORT} уже испльзуется`);
            } else {
                log.error('Ошибка сервера:', err);
            }

            shutdown('SERVER_ERROR', server);
        });
    } catch (err) {
        log.error('Не удалось запустить сервер', toError(err));
        await shutdown('SERVER_ERROR', server);
    }
};

export default startServer;
