import { join } from 'path';
import { Readable } from 'stream';
import { jest } from '@jest/globals';
import { serveStorageFiles } from '@server/middlewares/fileMiddleware.js';
import config from '@server/config/config.js';
import { STORAGE_ROOT } from '@server/config/paths.js';
import s3Client from '@server/config/s3Client.js';
import { STORAGE_TYPE, MULTER_MODE } from '@server/config/constants.js';
import type { Request, Response, NextFunction } from 'express';
import type { TStorageConfig } from '@server/types/index.js';

describe('Middlewares - Модуль File Middleware', () => {
    let originalStorage: TStorageConfig;

    let mockRequest: Request;
    let mockResponse: Response;
    let nextFunction: NextFunction;

    let statusSpy: jest.Mock;
    let s3ClientSendSpy: any;

    beforeEach(() => {
        originalStorage = { ...config.storage };

        mockRequest = {
            path: '/vqwert6nq345bertb/moto-photo.jpg'
        } as Request;

        statusSpy = jest.fn().mockReturnValue({ end: jest.fn() });

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

        it(
            'должен выкидывать исключение для публичного типа S3 хранилища с отсутствующим потоком',
            async () => {
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
            }
        );

        it('должен успешно прокидывать поток файла из S3 public бакета клиенту', async () => {
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

        it('должен перехватывать ошибку public S3 стрима и передавать её в next', async () => {
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
    });
});
