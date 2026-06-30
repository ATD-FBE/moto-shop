import { jest } from '@jest/globals';
import { join } from 'path';
import { Readable } from 'stream';
import config from '@server/config/config.js';
import { STORAGE_ROOT } from '@server/config/paths.js';
import s3Client from '@server/config/s3Client.js';
import { STORAGE_TYPE } from '@server/config/constants.js';
import type { Request, Response, NextFunction } from 'express';
import type { TStorageConfig } from '@server/types/index.js';

// РЕГИСТРАЦИЯ МОКА ДЛЯ ESM (Строго ДО динамических импортов!)
jest.unstable_mockModule('@aws-sdk/s3-request-presigner', () => ({
    getSignedUrl: jest.fn()
}));

// ДИНАМИЧЕСКИЕ ИМПОРТЫ
const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner');
const { serveStorageFiles } = await import('@server/middlewares/fileMiddleware.js');

describe('Middlewares - Модуль File Middleware', () => {
    let originalStorage: TStorageConfig;

    let mockRequest: Request;
    let mockResponse: Response;
    let nextFunction: NextFunction;

    let statusSpy: jest.Mock;
    let endSpy: jest.Mock;
    let s3ClientSendSpy: any;

    beforeEach(() => {
        originalStorage = { ...config.storage };

        mockRequest = {
            path: '/vqwert6nq345bertb/moto-photo.jpg'
        } as Request;

        endSpy = jest.fn();
        statusSpy = jest.fn().mockReturnValue({ end: endSpy });

        mockResponse = {
            set: jest.fn().mockReturnThis(),
            sendFile: jest.fn(),
            redirect: jest.fn(),
            status: statusSpy
        } as unknown as Response;

        nextFunction = jest.fn();

        s3ClientSendSpy = jest.spyOn(s3Client, 'send');
    });

    afterEach(() => {
        Object.defineProperty(config, 'storage', {
            value: originalStorage, // Сброс настроек хранилища файлов
            configurable: true
        });

        jest.restoreAllMocks();
    });

    // ==========================================
    // serveStorageFiles
    // ==========================================

    describe('Мидлвар serveStorageFiles', () => {
        it('должен вернуть статус 404, если путь к файлу отсутствует', async () => {
            mockRequest = { path: '/' } as Request;

            await serveStorageFiles(mockRequest, mockResponse, nextFunction);

            expect(statusSpy).toHaveBeenCalledWith(404);
            expect(endSpy).toHaveBeenCalled();
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('должен начать отправку файла, если тип хранилища FS и его ключ валиден', async () => {
            Object.defineProperty(config, 'storage', {
                value: {
                    type: STORAGE_TYPE.FS
                },
                configurable: true
            });

            const filePath = '/vqwert6nq345bertb/moto-photo.jpg';
            const expectedPath = join(STORAGE_ROOT, filePath.replace(/^\//, ''));

            mockRequest = { path: filePath } as Request;

            await serveStorageFiles(mockRequest, mockResponse, nextFunction);

            expect(mockResponse.sendFile).toHaveBeenCalled();
            expect(mockResponse.sendFile).toHaveBeenCalledWith(expectedPath);
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('должен выкинуть исключение для public S3 хранилища с отсутствующим потоком', async () => {
            Object.defineProperty(config, 'storage', {
                value: {
                    type: STORAGE_TYPE.S3,
                    bucket: 'motoshop',
                    bucketType: 'public'
                },
                configurable: true
            });

            s3ClientSendSpy.mockResolvedValue({ Body: { pipe: 'null' } });

            await serveStorageFiles(mockRequest, mockResponse, nextFunction);

            const invalidStreamError = new Error('S3 Response Body не является потоком');
            expect(nextFunction).toHaveBeenCalledWith(invalidStreamError);
            expect(nextFunction).toHaveBeenCalledTimes(1);
        });

        it('должен перехватить ошибку public S3 стрима и передавать её в next', async () => {
            Object.defineProperty(config, 'storage', {
                value: {
                    type: STORAGE_TYPE.S3,
                    bucket: 'motoshop',
                    bucketType: 'public'
                },
                configurable: true
            });

            const mockStream = new Readable({
                read() {} // Минимальная заглушка для инициализации потока чтения
            });
        
            const streamOnSpy = jest.spyOn(mockStream, 'on');
        
            s3ClientSendSpy.mockResolvedValue({
                Body: mockStream,
                ContentType: 'image/jpeg'
            });

            await serveStorageFiles(mockRequest, mockResponse, nextFunction);

            expect(streamOnSpy).toHaveBeenCalledWith('error', expect.any(Function));

            const streamError = new Error('Stream connection lost');
            mockStream.emit('error', streamError); // Искусственное создание сбоя внутри стрима
            
            expect(nextFunction).toHaveBeenCalledWith(streamError);
            expect(nextFunction).toHaveBeenCalledTimes(2); // Вызов next дважды - в try и в catch
        });

        it('должен успешно прокинуть поток файла из public S3 бакета клиенту', async () => {
            Object.defineProperty(config, 'storage', {
                value: {
                    type: STORAGE_TYPE.S3,
                    bucket: 'motoshop',
                    bucketType: 'public'
                },
                configurable: true
            });

            const mockStream = {
                on: jest.fn().mockReturnThis(), // Чейнинг для stream.on('error', ...)
                pipe: jest.fn()
            };

            s3ClientSendSpy.mockResolvedValue({
                Body: mockStream,
                ContentType: 'image/jpeg',
                ContentLength: 1024
            });

            await serveStorageFiles(mockRequest, mockResponse, nextFunction);

            expect(mockResponse.set).toHaveBeenCalledWith('Content-Type', 'image/jpeg');
            expect(mockResponse.set).toHaveBeenCalledWith('Content-Length', '1024');
            expect(mockStream.pipe).toHaveBeenCalledWith(mockResponse);
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('должен генерировать подписанную ссылку и перенаправлять клиента для private S3', async () => {
            Object.defineProperty(config, 'storage', {
                value: {
                    type: STORAGE_TYPE.S3,
                    bucket: 'motoshop',
                    bucketType: 'private'
                },
                configurable: true
            });

            const mockUrl = 'https://fake-s3-link.com/ber674w55tber6jw4e5b/photo.jpg';
            jest.mocked(getSignedUrl).mockResolvedValue(mockUrl);

            await serveStorageFiles(mockRequest, mockResponse, nextFunction);

            expect(getSignedUrl).toHaveBeenCalledWith(
                s3Client,
                expect.any(Object), // GetObjectCommand
                { expiresIn: 3600 }
            );

            expect(mockResponse.redirect).toHaveBeenCalled();
            expect(mockResponse.redirect).toHaveBeenCalledWith(mockUrl);
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('должен передать ошибку неверного типа S3 bucket в глобальный обработчик', async () => {
            const invalidBucketType = 'garbage';
            Object.defineProperty(config, 'storage', {
                value: {
                    type: STORAGE_TYPE.S3,
                    bucket: 'motoshop',
                    bucketType: invalidBucketType
                },
                configurable: true
            });

            const unexpectedError = new Error(`Некорректный bucket-тип хранилища s3: ${invalidBucketType}`);

            await serveStorageFiles(mockRequest, mockResponse, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(unexpectedError);
            expect(nextFunction).toHaveBeenCalledTimes(1);
        });

        it('должен вернуть статус 404, если файл не найден в S3 бакете (NoSuchKey)', async () => {
            Object.defineProperty(config, 'storage', {
                value: {
                    type: STORAGE_TYPE.S3,
                    bucket: 'motoshop',
                    bucketType: 'public'
                },
                configurable: true
            });

            const awsError = new Error('The specified key does not exist');
            awsError.name = 'NoSuchKey';

            s3ClientSendSpy.mockRejectedValue(awsError);

            await serveStorageFiles(mockRequest, mockResponse, nextFunction);

            expect(statusSpy).toHaveBeenCalledWith(404);
            expect(endSpy).toHaveBeenCalled();
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('должен передать неизвестную ошибку в глобальный обработчик через next(error)', async () => {
            Object.defineProperty(config, 'storage', {
                value: {
                    type: STORAGE_TYPE.S3,
                    bucket: 'motoshop',
                    bucketType: 'public'
                },
                configurable: true
            });

            const unexpectedError = new Error('Unexpected Error');
            s3ClientSendSpy.mockRejectedValue(unexpectedError);

            await serveStorageFiles(mockRequest, mockResponse, nextFunction);

            expect(nextFunction).toHaveBeenCalledWith(unexpectedError);
            expect(nextFunction).toHaveBeenCalledTimes(1);
        });
    });
});
