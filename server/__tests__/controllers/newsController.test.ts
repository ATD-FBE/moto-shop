import { jest } from '@jest/globals';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '@server/core/app.js';
import User from '@server/db/models/User.js';
import News from '@server/db/models/News.js';
import { generateToken } from '@server/utils/tokenUtils.js';
import { assertDefined } from '@shared/commonHelpers.js';
import { USER_ROLE } from '@shared/constants.js';
import type { Response } from 'express';
import type { TDbUser, TDbNews } from '@server/types/index.js';

describe('Integration Tests - Модуль News Controller', () => {
    let admin: TDbUser | undefined;
    let customer: TDbUser | undefined;
    let news1: TDbNews | undefined;
    let news2: TDbNews | undefined;

    beforeAll(async () => {
        const testDbUri = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/test_motoshopdb';
        
        if (mongoose.connection.readyState === 0) {
            await mongoose.connect(testDbUri);
        }

        admin = await User.create({
            name: 'Главный Админ',
            role: USER_ROLE.ADMIN,
            email: 'cvetbqw34rf5@cert.vrw',
            password: '1234563asd'
        });
        customer = await User.create({
            name: 'Покупатель',
            role: USER_ROLE.CUSTOMER,
            email: 'vaes4v34efr@cert.vrw',
            password: '1234563asd'
        });
    });

    afterEach(async () => {
        await News.deleteMany({});
    });

    beforeEach(async () => {
        assertDefined(admin, 'admin');

        const adminId = admin._id;

        [news1, news2] = await News.create([
            {
                title: 'Новость 1',
                content: 'Текст новости 1',
                publishDate: new Date(Date.now() - 10000),
                createdBy: adminId
            },
            {
                title: 'Новость 2',
                content: 'Текст новости 1',
                publishDate: new Date(Date.now() - 5000),
                createdBy: adminId,
                updateHistory: [{
                    updatedBy: adminId,
                    updatedAt: new Date(Date.now() - 3000)
                }]
            }
        ]);
    });

    afterAll(async () => {
        await User.deleteMany({});
        await News.deleteMany({});
        await mongoose.connection.close();
    });

    // ==========================================
    // GET /api/news
    // ==========================================

    describe('Запрос GET /api/news', () => {
        it('[гость] -> должен вернуть массив объектов с безопасными данными новостей', async () => {
            const response = await request(app)
                .get('/api/news')
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message');

            expect(response.body).toHaveProperty('newsList');
            expect(response.body.newsList).toHaveLength(2);

            expect(response.body.newsList[0]).not.toHaveProperty('createdBy');
            expect(response.body.newsList[0]).not.toHaveProperty('updateHistory');
        });

        it('[отсутствующий в базе юзер] -> должен вернуть ошибку 410', async () => {
            const missingUser = { _id: '68ee44a23705025f5a02d892', role: USER_ROLE.CUSTOMER };
            const accessToken = generateToken(missingUser, 'access');

            const response = await request(app)
                .get('/api/news')
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(410);
    
            expect(response.body).toHaveProperty('message');
            expect(response.body).not.toHaveProperty('newsList');
        });

        it('[покупатель] -> должен вернуть массив объектов с безопасными данными новостей', async () => {
            assertDefined(customer, 'customer');

            const accessToken = generateToken(customer, 'access');

            const response = await request(app)
                .get('/api/news')
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message');

            expect(response.body).toHaveProperty('newsList');
            expect(response.body.newsList).toHaveLength(2);

            expect(response.body.newsList[0]).not.toHaveProperty('createdBy');
            expect(response.body.newsList[0]).not.toHaveProperty('updateHistory');
        });

        it('[админ] -> должен передавать ошибку БД в globalErrorHandler со статусом 500', async () => {
            const newsDbSpy = jest.spyOn(News, 'find').mockImplementationOnce(() => {
                throw new Error('Критическая ошибка MongoDB (Тест)');
            });
    
            const response = await request(app)
                .get('/api/news')
                .expect(500);
    
            expect(response.body).toHaveProperty('message');
            expect(response.body).not.toHaveProperty('newsList');

            newsDbSpy.mockRestore(); // Очистка моков
        });

        it('[админ] -> должен вернуть массив объектов с полными данными новостей', async () => {
            assertDefined(admin, 'admin');

            const accessToken = generateToken(admin, 'access');

            const response = await request(app)
                .get('/api/news')
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(200);

            expect(response.body).toHaveProperty('message');

            expect(response.body).toHaveProperty('newsList');
            expect(response.body.newsList).toHaveLength(2);

            expect(response.body.newsList[0]).toHaveProperty('createdBy');
            expect(response.body.newsList[0].createdBy).toBe(admin.name);

            expect(response.body.newsList[0]).toHaveProperty('updateHistory');
            expect(response.body.newsList[0].updateHistory).toHaveLength(1);
            expect(response.body.newsList[0].updateHistory[0].updatedBy).toBe(admin.name);
        });
    });

    // ==========================================
    // GET /api/news/:newsId
    // ==========================================

    describe('Запрос GET /api/news/:newsId', () => {
        it('[гость] -> должен вернуть ошибку 401', async () => {
            assertDefined(news1, 'news1');

            const news1Id = news1._id.toString();
    
            const response = await request(app)
                .get(`/api/news/${news1Id}`)
                .expect('Content-Type', /json/)
                .expect(401);
    
            expect(response.body).toHaveProperty('message');
            expect(response.body).not.toHaveProperty('news');
        });

        it('[отсутствующий в базе юзер] - должен вернуть ошибку 410', async () => {
            assertDefined(news1, 'news1');

            const news1Id = news1._id.toString();
            const missingUser = { _id: '68ee44a23705025f5a02d892', role: USER_ROLE.ADMIN };
            const accessToken = generateToken(missingUser, 'access');

            const response = await request(app)
                .get(`/api/news/${news1Id}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(410);
    
            expect(response.body).toHaveProperty('message');
            expect(response.body).not.toHaveProperty('news');
        });

        it('[авторизованный юзер, не админ] -> должен вернуть ошибку 403', async () => {
            assertDefined(customer, 'customer');
            assertDefined(news2, 'news2');

            const news2Id = news2._id.toString();
            const accessToken = generateToken(customer, 'access');
    
            const response = await request(app)
                .get(`/api/news/${news2Id}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(403);
    
            expect(response.body).toHaveProperty('message');
            expect(response.body).not.toHaveProperty('news');
        });
        
        it('[админ] -> должен вернуть ошибку 400 для невалидного ID новости', async () => {
            assertDefined(admin, 'admin');

            const invalidNewsId = '[123zxc]';
            const accessToken = generateToken(admin, 'access');

            const response = await request(app)
                .get(`/api/news/${invalidNewsId}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(400);
    
            expect(response.body).toHaveProperty('message');
            expect(response.body).not.toHaveProperty('news');
        });

        it('[админ] -> должен вернуть ошибку 404 для отсутствующей новости в БД', async () => {
            assertDefined(admin, 'admin');

            const missingNewsId = '68ee44a23705025f5a02d891';
            const accessToken = generateToken(admin, 'access');

            const response = await request(app)
                .get(`/api/news/${missingNewsId}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(404);
    
            expect(response.body).toHaveProperty('message');
            expect(response.body).not.toHaveProperty('news');
        });

        it('[админ] -> должен передавать ошибку БД в globalErrorHandler со статусом 500', async () => {
            assertDefined(admin, 'admin');
            assertDefined(news2, 'news2');

            const news2Id = news2._id.toString();
            const accessToken = generateToken(admin, 'access');

            const newsDbSpy = jest.spyOn(News, 'findById').mockImplementationOnce(() => {
                throw new Error('Критическая ошибка MongoDB (Тест)');
            });
    
            const response = await request(app)
                .get(`/api/news/${news2Id}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(500);
    
            expect(response.body).toHaveProperty('message');
            expect(response.body).not.toHaveProperty('newsList');

            newsDbSpy.mockRestore(); // Очистка моков
        });

        it('[админ] -> должен вернуть данные запрашиваемой новости и статус 200', async () => {
            assertDefined(admin, 'admin');
            assertDefined(news1, 'news1');

            const news1Id = news1._id.toString();
            const accessToken = generateToken(admin, 'access');

            const response = await request(app)
                .get(`/api/news/${news1Id}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(200);
    
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('news');
            expect(response.body.news.title).toBe(news1.title);
        });
    });

    // ==========================================
    // POST /api/news
    // ==========================================

    describe('Запрос POST /api/news', () => {
        it('[гость] -> должен вернуть ошибку 401', async () => {
            const response = await request(app)
                .post('/api/news')
                .expect('Content-Type', /json/)
                .expect(401);
    
            expect(response.body).toHaveProperty('message');
        });

        it('[отсутствующий в базе юзер] -> должен вернуть ошибку 410', async () => {
            const missingUser = { _id: '68ee44a23705025f5a02d892', role: USER_ROLE.ADMIN };

            const accessToken = generateToken(missingUser, 'access');

            const response = await request(app)
                .post('/api/news')
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(410);
    
            expect(response.body).toHaveProperty('message');
        });

        it('[авторизованный юзер, не админ] -> должен вернуть ошибку 403', async () => {
            assertDefined(customer, 'customer');

            const accessToken = generateToken(customer, 'access');

            const response = await request(app)
                .post('/api/news')
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(403);
    
            expect(response.body).toHaveProperty('message');
        });

        it('[админ] -> должен обработать невалидные поля и вернуть статус 422', async () => {
            assertDefined(admin, 'admin');

            const accessToken = generateToken(admin, 'access');
            const invalidBody = {
                title: '',
                content: [{ a: 1, b: 2 }]
            };

            const response = await request(app)
                .post('/api/news')
                .set('Cookie', [`accessToken=${accessToken}`])
                .send(invalidBody)
                .expect('Content-Type', /json/)
                .expect(422);
    
            expect(response.body).toHaveProperty('message');
            expect(response.body).toHaveProperty('fieldErrors');
            expect(response.body.fieldErrors).toHaveProperty('title');
            expect(response.body.fieldErrors).toHaveProperty('content');
        });

        it('[админ] -> должен передавать ошибку БД в globalErrorHandler со статусом 500', async () => {
            assertDefined(admin, 'admin');

            const accessToken = generateToken(admin, 'access');
            const body = {
                title: 'Новость 3',
                content: 'Текст новости 3'
            };

            const newsDbSpy = jest.spyOn(News, 'create').mockImplementationOnce(() => {
                throw new Error('Критическая ошибка MongoDB (Тест)');
            });
    
            const response = await request(app)
                .post('/api/news')
                .set('Cookie', [`accessToken=${accessToken}`])
                .send(body)
                .expect('Content-Type', /json/)
                .expect(500);
    
            expect(response.body).toHaveProperty('message');

            newsDbSpy.mockRestore(); // Очистка моков
        });

        it('[админ] -> должен откатить изменения в транзакции при таймауте и вернуть 408', async () => {
            assertDefined(admin, 'admin');

            const accessToken = generateToken(admin, 'access');
            const body = {
                title: 'Новость 3',
                content: 'Текст новости 3'
            };

            let timeoutCallback: (() => void) | undefined;

            const responseSetTimeoutSpy = jest.spyOn(app.response, 'setTimeout')
                .mockImplementationOnce(function (this: Response, _duration: unknown, cb: unknown) {
                    if (typeof cb === 'function') timeoutCallback = cb as () => void;
                    return this; 
                });

            const newsDbCreateSpy = jest.spyOn(News, 'create')
                .mockImplementationOnce(async function (...args) {
                    timeoutCallback?.(); 
                    
                    const originalMethod = News.create.bind(News);
                    return originalMethod(...args);
                });

            const response = await request(app)
                .post('/api/news')
                .set('Cookie', [`accessToken=${accessToken}`])
                .send(body)
                .expect('Content-Type', /json/)
                .expect(408);
    
            expect(response.body).toHaveProperty('message');

            // Проверка того, что новость не создалась в БД
            const createdNews = await News.findOne({ title: body.title }).lean<TDbNews>();
            expect(createdNews).toBeNull();

            // Очистка моков
            responseSetTimeoutSpy.mockRestore();
            newsDbCreateSpy.mockRestore();
        });

        it('[админ] -> должен успешно создать новость и вернуть статус 201', async () => {
            assertDefined(admin, 'admin');

            const accessToken = generateToken(admin, 'access');
            const body = {
                title: 'Новость 3',
                content: 'Текст новости 3'
            };

            const response = await request(app)
                .post('/api/news')
                .set('Cookie', [`accessToken=${accessToken}`])
                .send(body)
                .expect('Content-Type', /json/)
                .expect(201);
    
            expect(response.body).toHaveProperty('message');

            // Проверка фактического наличия созданной новости в базе
            const createdNews = await News.findOne({ title: body.title }).lean<TDbNews>();
            
            expect(createdNews).not.toBeNull(); 
            assertDefined(createdNews, 'createdNews');

            expect(createdNews.content).toBe(body.content);
            expect(createdNews.createdBy.toString()).toBe(admin._id.toString());
            expect(createdNews.updateHistory).toHaveLength(0);
        });
    });

    // ==========================================
    // PUT /api/news/:newsId
    // ==========================================

    describe('Запрос PUT /api/news/:newsId', () => {
        it('[гость] -> должен вернуть ошибку 401', async () => {
            assertDefined(news1, 'news1');

            const news1Id = news1._id.toString();

            const response = await request(app)
                .put(`/api/news/${news1Id}`)
                .expect('Content-Type', /json/)
                .expect(401);
    
            expect(response.body).toHaveProperty('message');
        });

        it('[отсутствующий в базе юзер] -> должен вернуть ошибку 410', async () => {
            assertDefined(news1, 'news1');

            const news1Id = news1._id.toString();
            const missingUser = { _id: '68ee44a23705025f5a02d892', role: USER_ROLE.ADMIN };
            const accessToken = generateToken(missingUser, 'access');

            const response = await request(app)
                .put(`/api/news/${news1Id}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(410);
    
            expect(response.body).toHaveProperty('message');
        });

        it('[авторизованный юзер, не админ] -> должен вернуть ошибку 403', async () => {
            assertDefined(customer, 'customer');
            assertDefined(news1, 'news1');

            const news1Id = news1._id.toString();
            const accessToken = generateToken(customer, 'access');

            const response = await request(app)
                .put(`/api/news/${news1Id}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(403);
    
            expect(response.body).toHaveProperty('message');
        });

        it('[админ] -> должен вернуть ошибку 400 для невалидного ID новости', async () => {
            assertDefined(admin, 'admin');

            const invalidNewsId = '[123zxc]';
            const accessToken = generateToken(admin, 'access');
            const body = {
                title: 'Новость 1 (изм.)',
                content: 'Текст новости 1 (изм.)'
            };

            const response = await request(app)
                .put(`/api/news/${invalidNewsId}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .send(body)
                .expect('Content-Type', /json/)
                .expect(400);
    
            expect(response.body).toHaveProperty('message');
        });

        it('[админ] -> должен вернуть ошибку 404 для отсутствующей новости в БД', async () => {
            assertDefined(admin, 'admin');

            const missingNewsId = '68ee44a23705025f5a02d891';
            const accessToken = generateToken(admin, 'access');
            const body = {
                title: 'Новость 1 (изм.)',
                content: 'Текст новости 1 (изм.)'
            };

            const response = await request(app)
                .put(`/api/news/${missingNewsId}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .send(body)
                .expect('Content-Type', /json/)
                .expect(404);
    
            expect(response.body).toHaveProperty('message');
        });

        it('[админ] -> должен вернуть ошибку 204 без тела ответа для неизменённой новости', async () => {
            assertDefined(admin, 'admin');
            assertDefined(news1, 'news1');

            const news1Id = news1._id.toString();
            const accessToken = generateToken(admin, 'access');
            const body = {
                title: 'Новость 1',
                content: 'Текст новости 1'
            };

            const response = await request(app)
                .put(`/api/news/${news1Id}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .send(body)
                .expect(204);
    
            expect(response.body).not.toHaveProperty('message');
        });

        it('[админ] -> должен передавать ошибку БД в globalErrorHandler со статусом 500', async () => {
            assertDefined(admin, 'admin');
            assertDefined(news2, 'news2');

            const news2Id = news2._id.toString();
            const accessToken = generateToken(admin, 'access');
            const body = {
                title: 'Новость 2 (изм.)',
                content: 'Текст новости 2 (изм.)'
            };

            const newsDbSaveSpy = jest.spyOn(News.prototype, 'save').mockImplementationOnce(() => {
                throw new Error('Критическая ошибка MongoDB (Тест)');
            });
    
            const response = await request(app)
                .put(`/api/news/${news2Id}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .send(body)
                .expect('Content-Type', /json/)
                .expect(500);
    
            expect(response.body).toHaveProperty('message');

            newsDbSaveSpy.mockRestore(); // Очистка моков
        });

        it('[админ] -> должен откатить изменения в транзакции при таймауте и вернуть 408', async () => {
            assertDefined(admin, 'admin');
            assertDefined(news1, 'news1');

            const news1Id = news1._id.toString();
            const accessToken = generateToken(admin, 'access');
            const body = {
                title: 'Новость 1 (изм.)',
                content: 'Текст новости 1 (изм.)'
            };

            let timeoutCallback: (() => void) | undefined;

            const responseSetTimeoutSpy = jest.spyOn(app.response, 'setTimeout')
                .mockImplementationOnce(function (this: Response, _duration: unknown, cb: unknown) {
                    if (typeof cb === 'function') timeoutCallback = cb as () => void;
                    return this; 
                });

            const newsDbSaveSpy = jest.spyOn(News.prototype, 'save')
                .mockImplementationOnce(async function (this: mongoose.Document, ...args) {
                    timeoutCallback?.(); 
                    
                    const originalMethod = News.prototype.save.bind(this);
                    return originalMethod(...args);
                });

            const response = await request(app)
                .put(`/api/news/${news1Id}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .send(body)
                .expect('Content-Type', /json/)
                .expect(408);
    
            expect(response.body).toHaveProperty('message');

            // Проверка того, что новость не сохранились в БД с изменениями
            const corruptedNews = await News.findOne({ title: body.title }).lean<TDbNews>();
            expect(corruptedNews).toBeNull();

            // Проверка того, что целевая новость в БД не изменилась
            const rolledBackNews = await News.findOne({ title: news1.title }).lean<TDbNews>();
            
            expect(rolledBackNews).not.toBeNull(); 
            assertDefined(rolledBackNews, 'rolledBackNews');

            expect(rolledBackNews.content).toBe(news1.content);
            expect(rolledBackNews.updateHistory).toHaveLength(0);

            // Очистка моков
            responseSetTimeoutSpy.mockRestore();
            newsDbSaveSpy.mockRestore();
        });

        it('[админ] -> должен успешно изменить новость и вернуть статус 200', async () => {
            assertDefined(admin, 'admin');
            assertDefined(news1, 'news1');

            const news1Id = news1._id.toString();
            const accessToken = generateToken(admin, 'access');
            const body = {
                title: 'Новость 1 (изм.)',
                content: 'Текст новости 1 (изм.)'
            };

            const response = await request(app)
                .put(`/api/news/${news1Id}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .send(body)
                .expect('Content-Type', /json/)
                .expect(200);
    
            expect(response.body).toHaveProperty('message');

            // Проверка фактического изменения новости в базе
            const updatedNews = await News.findOne({ title: body.title }).lean<TDbNews>();
            
            expect(updatedNews).not.toBeNull(); 
            assertDefined(updatedNews, 'updatedNews');

            expect(updatedNews.content).toBe(body.content);

            expect(updatedNews.updateHistory).toHaveLength(1);
            assertDefined(updatedNews.updateHistory[0], 'updatedNews.updateHistory[0]');

            expect(updatedNews.updateHistory[0].updatedBy.toString()).toBe(admin._id.toString());
        });
    });

    // ==========================================
    // DELETE /api/news/:newsId
    // ==========================================

    describe('Запрос DELETE /api/news/:newsId', () => {
        it('[гость] -> должен вернуть ошибку 401', async () => {
            assertDefined(news1, 'news1');

            const news1Id = news1._id.toString();

            const response = await request(app)
                .delete(`/api/news/${news1Id}`)
                .expect('Content-Type', /json/)
                .expect(401);
    
            expect(response.body).toHaveProperty('message');
        });

        it('[отсутствующий в базе юзер] -> должен вернуть ошибку 410', async () => {
            assertDefined(news1, 'news1');

            const news1Id = news1._id.toString();
            const missingUser = { _id: '68ee44a23705025f5a02d892', role: USER_ROLE.ADMIN };
            const accessToken = generateToken(missingUser, 'access');

            const response = await request(app)
                .delete(`/api/news/${news1Id}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(410);
    
            expect(response.body).toHaveProperty('message');
        });

        it('[авторизованный юзер, не админ] -> должен вернуть ошибку 403', async () => {
            assertDefined(customer, 'customer');
            assertDefined(news1, 'news1');

            const news1Id = news1._id.toString();
            const accessToken = generateToken(customer, 'access');

            const response = await request(app)
                .delete(`/api/news/${news1Id}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(403);
    
            expect(response.body).toHaveProperty('message');
        });

        it('[админ] -> должен вернуть ошибку 400 для невалидного ID новости', async () => {
            assertDefined(admin, 'admin');

            const invalidNewsId = '{ q: 123zxc }';
            const accessToken = generateToken(admin, 'access');

            const response = await request(app)
                .delete(`/api/news/${invalidNewsId}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(400);
    
            expect(response.body).toHaveProperty('message');
        });

        it('[админ] -> должен вернуть ошибку 404 для отсутствующей новости в БД', async () => {
            assertDefined(admin, 'admin');

            const missingNewsId = '68ee44a23705025f5a02d891';
            const accessToken = generateToken(admin, 'access');

            const response = await request(app)
                .delete(`/api/news/${missingNewsId}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(404);
    
            expect(response.body).toHaveProperty('message');
        });

        it('[админ] -> должен передавать ошибку БД в globalErrorHandler со статусом 500', async () => {
            assertDefined(admin, 'admin');
            assertDefined(news2, 'news2');

            const news2Id = news2._id.toString();
            const accessToken = generateToken(admin, 'access');

            const newsDbSpy = jest.spyOn(News, 'findByIdAndDelete').mockImplementationOnce(() => {
                throw new Error('Критическая ошибка MongoDB (Тест)');
            });
    
            const response = await request(app)
                .delete(`/api/news/${news2Id}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(500);
    
            expect(response.body).toHaveProperty('message');

            newsDbSpy.mockRestore(); // Очистка моков
        });

        it('[админ] -> должен откатить изменения в транзакции при таймауте и вернуть 408', async () => {
            assertDefined(admin, 'admin');
            assertDefined(news1, 'news1');

            const news1Id = news1._id.toString();
            const accessToken = generateToken(admin, 'access');
            let timeoutCallback: (() => void) | undefined;

            const responseSetTimeoutSpy = jest.spyOn(app.response, 'setTimeout')
                .mockImplementationOnce(function (this: Response, _duration: unknown, cb: unknown) {
                    if (typeof cb === 'function') timeoutCallback = cb as () => void;
                    return this; 
                });

            const newsDbFindByIdAndDeleteSpy = jest.spyOn(News, 'findByIdAndDelete')
                .mockImplementationOnce(function (...args) {
                    timeoutCallback?.(); 
                    
                    const originalMethod = News.findByIdAndDelete.bind(News);
                    return originalMethod(...args);
                });

            const response = await request(app)
                .delete(`/api/news/${news1Id}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(408);
    
            expect(response.body).toHaveProperty('message');

            // Проверка того, что новость не удалена из БД
            const rolledBackNews = await News.findById(news1Id).lean<TDbNews>();
            expect(rolledBackNews).not.toBeNull();

            // Очистка моков
            responseSetTimeoutSpy.mockRestore();
            newsDbFindByIdAndDeleteSpy.mockRestore();
        });

        it('[админ] -> должен успешно удалить новость и вернуть статус 200', async () => {
            assertDefined(admin, 'admin');
            assertDefined(news1, 'news1');

            const news1Id = news1._id.toString();
            const accessToken = generateToken(admin, 'access');

            const response = await request(app)
                .delete(`/api/news/${news1Id}`)
                .set('Cookie', [`accessToken=${accessToken}`])
                .expect('Content-Type', /json/)
                .expect(200);
    
            expect(response.body).toHaveProperty('message');

            // Проверка фактического удаления новости в базе
            const deletedNews = await News.findById(news1Id).lean<TDbNews>();
            expect(deletedNews).toBeNull();
        });
    });
});
