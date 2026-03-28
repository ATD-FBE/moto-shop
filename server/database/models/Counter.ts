import { Schema, model } from 'mongoose';
import type { TDbCounter } from '@server/types/index.js';

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
  
const Counter = model<TDbCounter>('Counter', CounterSchema);

export default Counter;
