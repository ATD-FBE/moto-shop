import { jest } from '@jest/globals';
import jwt from 'jsonwebtoken';
import { disableCache, verifyAuth } from '@server/middlewares/authMiddleware.js';
import { USER_ROLE } from '@shared/constants.js';
import type { Request, Response, NextFunction } from 'express';

describe('Middlewares - Модуль Auth Middleware', () => {
    let mockRequest: Request;
    let mockResponse: Response;
    let nextFunction: NextFunction;

    let statusSpy: jest.Mock;
    let jsonSpy: jest.Mock;
    let jwtVerifySpy: ReturnType<typeof jest.spyOn>;

    beforeEach(() => {
        mockRequest = {
            cookies: {}
        } as Request;

        jsonSpy = jest.fn();
        statusSpy = jest.fn().mockReturnValue({ json: jsonSpy }); // Имитация чейнинга: res.status().json()

        mockResponse = {
            set: jest.fn().mockReturnThis(),
            status: statusSpy
        } as unknown as Response;

        nextFunction = jest.fn();

        // Слежка за вызовом функции verify на объекте jwt для перехвата управления и результата выполнения
        jwtVerifySpy = jest.spyOn(jwt, 'verify');
    });

    afterEach(() => {
        jest.restoreAllMocks(); // Сброс всех моков (чистка шпионов) после каждого теста (it)
    });

    // ==========================================
    // disableCache
    // ==========================================

    describe('Мидлвар disableCache', () => {
        it('должен устанавливать заголовок Cache-Control в "no-store" и вызывать next()', () => {
            disableCache(mockRequest, mockResponse, nextFunction);

            // Проверяем, что заголовок был установлен корректно
            expect(mockResponse.set).toHaveBeenCalledWith('Cache-Control', 'no-store');

            // Проверяем, что управление передано следующему мидлвэару
            expect(nextFunction).toHaveBeenCalledTimes(1);
        });
    });

    // ==========================================
    // verifyAuth
    // ==========================================

    describe('Мидлвар verifyAuth', () => {
        it('должен вернуть 401 через safeSendResponse, если accessToken отсутствует в cookies', async () => {
            mockRequest.cookies = { someOtherCookie: '123abc' };

            await verifyAuth(mockRequest, mockResponse, nextFunction);

            expect(statusSpy).toHaveBeenCalledWith(401);
            expect(jsonSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Токен доступа отсутствует'
                })
            );
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('должен вернуть 401, если токен провалил проверку тайп-гарда (битый формат)', async () => {
            mockRequest.cookies = { accessToken: 'malformed.token' };

            const invalidDecodedUser = { unknownField: 'garbage' };
            jwtVerifySpy.mockReturnValue(invalidDecodedUser);

            await verifyAuth(mockRequest, mockResponse, nextFunction);

            expect(statusSpy).toHaveBeenCalledWith(401);
            expect(jsonSpy).toHaveBeenCalledWith(
                expect.objectContaining({
                    message: 'Неверный формат или поврежденный токен'
                })
            );
            expect(nextFunction).not.toHaveBeenCalled();
        });

        it('должен успешно валидировать токен, записать user в req и вызвать next()', async () => {
            const accessToken = 'valid.token.signature';
            mockRequest.cookies = { accessToken };

            const fakeDecodedUser = { _id: 'user123', role: USER_ROLE.CUSTOMER };
            jwtVerifySpy.mockReturnValue(fakeDecodedUser);

            await verifyAuth(mockRequest, mockResponse, nextFunction);

            expect(jwt.verify).toHaveBeenCalledWith(accessToken, expect.any(String));
            expect(mockRequest.user).toEqual(fakeDecodedUser);
            expect(nextFunction).toHaveBeenCalledTimes(1);
        });

        it(
            'должен обрабатывать TokenExpiredError и ' +
            'возвращать подготовленный текст для этой ошибки со статусом 401',
            async () => {
                mockRequest.cookies = { accessToken: 'expired.token' };

                jwtVerifySpy.mockImplementation(() => {
                    const expiredError = new Error('jwt expired');
                    expiredError.name = 'TokenExpiredError';
                    throw expiredError;
                });

                await verifyAuth(mockRequest, mockResponse, nextFunction);

                expect(statusSpy).toHaveBeenCalledWith(401);
                expect(jsonSpy).toHaveBeenCalledWith(
                    expect.objectContaining({
                        message: 'Срок действия токена доступа истёк'
                    })
                );
                expect(nextFunction).not.toHaveBeenCalled();
            }
        );

        it('должен передавать неизвестные ошибки в глобальный обработчик через next(error)', async () => {
            mockRequest.cookies = { accessToken: 'some.token' };

            const errorMessage = 'Unexpected Error';
            const unexpectedError = new Error(errorMessage);

            jwtVerifySpy.mockImplementation(() => {
                throw unexpectedError;
            });

            await verifyAuth(mockRequest, mockResponse, nextFunction);

            expect(statusSpy).not.toHaveBeenCalled();
            expect(jsonSpy).not.toHaveBeenCalled();
            expect(nextFunction).toHaveBeenCalledWith(unexpectedError);
            expect(nextFunction).toHaveBeenCalledTimes(1);
        });
    });
});
