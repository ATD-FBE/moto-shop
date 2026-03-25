import winston from 'winston';

export interface IWinstonLogInfo extends winston.Logform.TransformableInfo {
    timestamp: string;
    message: string;
    stack?: string;
}

export interface IWinstonPreparedLogInfo {
    timestamp: string;
    level: string;
    message: string;
    stackData: string;
    metaData: string
}
