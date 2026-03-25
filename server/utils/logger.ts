import winston from 'winston';
import { LOG_COMBINED_FILE_PATH, LOG_ERROR_FILE_PATH } from '@server/config/paths.js';
import type { IWinstonLogInfo, IWinstonPreparedLogInfo } from '@server/types/index.js';

const prepareInfo = (info: IWinstonLogInfo): IWinstonPreparedLogInfo => {
    const { timestamp = '', level = 'info', message = '', stack, ...meta } = info;
    const stackData = stack ? `\n${stack}` : '';
    const metaData = Object.keys(meta).length ? `\n${JSON.stringify(meta, null, 4)}` : '';
    return { timestamp, level, message, stackData, metaData };
};

const timestampFormat = 'YYYY-MM-DD HH:mm:ss';

const loggerConfig: winston.LoggerOptions = {
    level: 'info',

    format: winston.format.combine( // Общий формат (файлы и консоль)
        winston.format.timestamp({ format: timestampFormat }),
        winston.format.splat(), // Для более двух аргументов в логгере (meta - обязательно объекты!)
        winston.format.printf(info => {
            const { timestamp, level, message, stackData, metaData } = prepareInfo(info as IWinstonLogInfo);
            return `[${timestamp}] [${level.toUpperCase()}]: ${message}${stackData}${metaData}\n`;
        })
    ),

    transports: [
        ...(process.env.NODE_ENV !== 'production'
            ? [new winston.transports.File({ filename: LOG_COMBINED_FILE_PATH })]
            : []),
        new winston.transports.File({
            filename: LOG_ERROR_FILE_PATH,
            level: 'error'
        }),
        new winston.transports.Console({
            format: winston.format.combine( // Персональный формат для консоли
                winston.format.colorize(),
                winston.format.timestamp({ format: timestampFormat }),
                winston.format.splat(), // Для более двух аргументов в логгере (meta - обязательно объекты!)
                winston.format.printf(info => {
                    const { timestamp, level, message, stackData, metaData } = prepareInfo(info as IWinstonLogInfo);
                    return `${level}: ${message} - { timestamp: ${timestamp} }${stackData}${metaData}`;
                })
            )
        })
    ]
};

const logger = winston.createLogger(loggerConfig);

export default logger;
