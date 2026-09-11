import { Setting } from "./lib/types";

export function getSettingValue(settings: Setting[], code: string): string | null {
    return settings.find((s) => s.code === code)?.value ?? null;
}
