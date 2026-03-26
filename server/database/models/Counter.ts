import { Schema, model } from 'mongoose';
import type { TCounter } from '@server/types/index.js';

export const CounterSchema = new Schema({
    entity: {
        type: String,
        required: true,
        unique: true // Задаёт индекс по этому полю для быстрого поиска
    },
    seq: {
        type: Number,
        default: 0
    }
});
  
const Counter = model<TCounter>('Counter', CounterSchema);

export default Counter;
