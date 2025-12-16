export const parseJsonEnv = <T>(value: string | undefined, label: string): T | Record<string, never> => {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as T;
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
    console.warn(`[env] ${label} is not an object; ignoring`);
    return {};
  } catch (error) {
    console.warn(`[env] Failed to parse ${label}: ${(error as Error).message}`);
    return {};
  }
};
