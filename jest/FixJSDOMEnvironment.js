import JSDOMEnvironment from 'jest-environment-jsdom';

export default class FixJSDOMEnvironment extends JSDOMEnvironment {
    constructor(...args) {
        super(...args);
        
        // Прокидывание нативных веб-стандартов Node.js внутрь песочницы JSDOM
        this.global.TextEncoder = global.TextEncoder;
        this.global.TextDecoder = global.TextDecoder;

        this.global.fetch = global.fetch;
        this.global.Headers = global.Headers;
        this.global.Request = global.Request;
        this.global.Response = global.Response;

        this.global.ReadableStream = global.ReadableStream;
        this.global.WritableStream = global.WritableStream;
        this.global.TransformStream = global.TransformStream;

        this.global.BroadcastChannel = global.BroadcastChannel;
        this.global.WebSocket = global.WebSocket;

        this.global.crypto = global.crypto;

        this.global.Blob = global.Blob;
        this.global.File = global.File;
        this.global.FormData = global.FormData;

        this.global.AbortController = global.AbortController;
        this.global.AbortSignal = global.AbortSignal;

        this.global.ResizeObserver = class ResizeObserver {
            observe() {}
            unobserve() {}
            disconnect() {}
        };
    }
}
