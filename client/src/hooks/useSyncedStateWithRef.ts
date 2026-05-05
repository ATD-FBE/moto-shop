import { useState, useRef } from 'react';
import type { RefObject } from 'react';

//////////////////////////
/// TYPES & INTERFACES ///
//////////////////////////

type TStateUpdaterFn<T> = (prevState: T) => T;
type TSetUpdater<T> = TStateUpdaterFn<T> | T;
type TUseSyncedStateWithRefResult<T> = [T, (updater: TSetUpdater<T>) => void, RefObject<T>];

/////////////////////
/// FUNCTIONALITY ///
/////////////////////

const isFunction = <T>(val: TSetUpdater<T>): val is TStateUpdaterFn<T> => typeof val === 'function';

export default function useSyncedStateWithRef<T>(initialValue: T): TUseSyncedStateWithRefResult<T> {
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
