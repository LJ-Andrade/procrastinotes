import type { Language } from "./preferences";
import { en } from "./translations/en";
import { es } from "./translations/es";
import type { Strings } from "./translations/types";

const STRINGS: Record<Language, Strings> = {
  en,
  es,
};

export type { Strings } from "./translations/types";

export function getStrings(language: Language): Strings {
  return STRINGS[language];
}
