import '@testing-library/jest-dom'; // Добавление клиентских методов-матчеров для expect
import { TextEncoder, TextDecoder } from 'util';

globalThis.TextEncoder = TextEncoder;
globalThis.TextDecoder = TextDecoder;
