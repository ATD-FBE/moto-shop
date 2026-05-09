let lastInputWasKeyboard = false;

export const setKeyboardInput = (): void => {
    lastInputWasKeyboard = true;
};

export const setPointerInput = (): void => {
    lastInputWasKeyboard = false;
};

export const wasLastInputKeyboard = (): boolean => lastInputWasKeyboard;
