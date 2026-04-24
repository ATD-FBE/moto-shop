export const logToolbarMissingProps = (componentName: string, props: Record<string, any>): void => {
    const missingProps = Object.entries(props)
        .filter(([_, value]) => !value)
        .map(([key]) => key);

    if (missingProps.length > 0) {
        console.error(`[${componentName}] Отсутствуют критические пропсы: ${missingProps.join(', ')}`);
    }
};
