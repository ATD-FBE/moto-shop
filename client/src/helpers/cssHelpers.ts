export const getCssNumber = (varName: string, defaultValue: number): number => {
    const val = parseInt(getComputedStyle(document.documentElement).getPropertyValue(varName), 10);
    return Number.isNaN(val) ? defaultValue : val;
};
