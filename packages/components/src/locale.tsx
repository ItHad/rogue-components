import { createContext, useContext, type ReactNode } from "react";

export type Locale = "ja" | "en";

const LocaleContext = createContext<Locale>("ja");

export interface LocaleProviderProps {
  locale: Locale;
  children: ReactNode;
}

/** 配下のコンポーネントの表示言語を切り替える。 */
export function LocaleProvider({ locale, children }: LocaleProviderProps) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}

/** コンポーネントごとの文言表から、いまの言語のものを取り出す。 */
export function useMessages<T>(messages: Record<Locale, T>): T {
  return messages[useLocale()];
}
