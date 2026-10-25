import type { MouseEvent, ReactNode } from "react";
import { openUrl } from "@tauri-apps/plugin-opener";
import { isTauri } from "../services/runtime";

interface Props {
  href: string;
  children: ReactNode;
  onError?: (message: string) => void;
}

export function ExternalLink({ href, children, onError }: Props) {
  const click = (event: MouseEvent<HTMLAnchorElement>) => {
    if (!isTauri()) return;
    event.preventDefault();
    void openUrl(href).catch((reason) => onError?.(String(reason)));
  };

  return <a href={href} target="_blank" rel="noopener noreferrer" onClick={click}>{children}</a>;
}
