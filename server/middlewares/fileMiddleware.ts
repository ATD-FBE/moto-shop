import { join } from 'path';
import express, { type RequestHandler } from 'express';
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import config from '@server/config/config.js';
import s3Client from '@server/config/s3Client.js';
import { PUBLIC_PATH, BUILD_PATH, STORAGE_ROOT } from '@server/config/paths.js';
import { STORAGE_TYPE } from '@server/config/constants.js';
import { toError } from '@shared/commonHelpers.js';

export const serveBuildFiles = (exp: typeof express): RequestHandler => {
    if (config.env !== 'production') return (_req, _res, next) => next();
    return exp.static(BUILD_PATH); 
};

export const servePublicFiles = (exp: typeof express): RequestHandler => {
    if (config.env !== 'production') return (_req, _res, next) => next();
    return exp.static(PUBLIC_PATH);
};

export const serveReactApp: RequestHandler = (_req, res, next) => {
    if (config.env !== 'production') return next();
    return res.sendFile(join(PUBLIC_PATH, 'index.html'));
};

export const serveStorageFiles: RequestHandler = async (req, res, next) => {
    const storageKey = req.path.replace(/^\//, '');

    if (!storageKey || storageKey === req.path) {
        return res.status(404).end();
    }

    if (config.storage.type === STORAGE_TYPE.FS) {
        const filePath = join(STORAGE_ROOT, storageKey);
        return res.sendFile(filePath);
    }

    if (config.storage.type === STORAGE_TYPE.S3) {
        try {
            const getCommand = new GetObjectCommand({
                Bucket: config.storage.bucket,
                Key: storageKey
            });
    
            switch (config.storage.bucketType) {
                case 'public': {
                    // Получение потока данных с хранилища s3
                    const response = await s3Client.send(getCommand);
                    const stream = response.Body;

                    if (!stream || !('pipe' in stream) || typeof stream.pipe !== 'function') {
                        throw new Error('S3 Response Body не является потоком');
                    }
                    
                    // Установка заголовков на сервере для пришедших данных
                    if (response.ContentType) res.set('Content-Type', response.ContentType);
                    if (response.ContentLength) res.set('Content-Length', response.ContentLength.toString());

                    // Обработка стрима - Скачивание файла с хранилища s3 через сервер
                    stream.on('error', (err) => next(err));
                    return stream.pipe(res);
                }
    
                case 'private': {
                    // Генерация ссылки, действующей 1 час
                    const signedUrl = await getSignedUrl(s3Client, getCommand, { expiresIn: 3600 });

                    // Скачивание файла с s3 напрямую по подписанному URL
                    return res.redirect(signedUrl);
                }
    
                default:
                    throw new Error(`Некорректный bucket-тип хранилища s3: ${config.storage.bucketType}`);
            }
        } catch (err) {
            const error = toError(err);

            // Файла нет в S3 => SDK выкинет ошибку NoSuchKey
            if (error.name === 'NoSuchKey') {
                return res.status(404).end();
            }

            next(error);
        }
    }
};
