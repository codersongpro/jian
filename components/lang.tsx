"use client";
import { createContext, useContext, type ReactNode } from "react";
import { copy, type Lang } from "@/lib/i18n";

const Context = createContext<Lang>("ko");

export function LangProvider({
  lang,
  children,
}: {
  lang: Lang;
  children: ReactNode;
}) {
  return <Context.Provider value={lang}>{children}</Context.Provider>;
}

/** 현재 언어와 그 언어의 화면 문구 */
export function useCopy() {
  const lang = useContext(Context);
  return { lang, t: copy[lang] };
}
