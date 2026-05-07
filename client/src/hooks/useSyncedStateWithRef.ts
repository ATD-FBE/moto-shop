import { useState, useRef } from 'react';
import type { RefObject } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TStateUpdaterFn<T> = (prevState: T) => T;
type TSetUpdater<T> = T | TStateUpdaterFn<T>;
type TUseSyncedStateWithRefResult<T> = [T, (updater: TSetUpdater<T>) => void, RefObject<T>];

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const isFunction = <T>(val: TSetUpdater<T>): val is TStateUpdaterFn<T> => typeof val === 'function';

// Перегрузка: Сигнатура с аргументом-функцией
export default function useSyncedStateWithRef<T>(initialValue: () => T): TUseSyncedStateWithRefResult<T>;

// Перегрузка: Сигнатура с аргументом-результатом
export default function useSyncedStateWithRef<T>(initialValue: T): TUseSyncedStateWithRefResult<T>;

// Главная реализация хука
export default function useSyncedStateWithRef<T>(
    initialValue: T | (() => T)
): TUseSyncedStateWithRefResult<T> {
    const [state, setState] = useState(initialValue);
    const ref = useRef(state);

    const set = (updater: TSetUpdater<T>): void => {
        setState(prev => {
            const updatedValue = isFunction(updater) ? updater(prev) : updater;
            ref.current = updatedValue;
            return updatedValue;
        });
    };

    return [state, set, ref];
}
