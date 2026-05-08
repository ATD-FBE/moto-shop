const apiControllers = new Set<AbortController>();

export const addApiController = (controller: AbortController): void => {
    apiControllers.add(controller);
}

export const removeApiController = (controller: AbortController): void => {
    apiControllers.delete(controller);
}

export const abortAllApiControllers = (): void => {
    apiControllers.forEach(controller => controller.abort('manualAbort'));
    apiControllers.clear();
};
