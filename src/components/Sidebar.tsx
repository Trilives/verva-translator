import { Button } from "@fluentui/react-components";
import { History24Regular, Image24Regular, Settings24Regular, Translate24Regular, Server24Regular } from "@fluentui/react-icons";
import type { ReactElement } from "react";
import { useI18n } from "../i18n/I18nContext";

export type AppPage = "workspace" | "localModels" | "imageText" | "history" | "settings";

const primary = [
  { page: "workspace", icon: <Translate24Regular />, key: "workspace" },
  { page: "localModels", icon: <Server24Regular />, key: "localModels" },
  { page: "imageText", icon: <Image24Regular />, key: "imageText" },
  { page: "history", icon: <History24Regular />, key: "history" }
] as const;

export function Sidebar({ page, onPage }: { page: AppPage; onPage: (page: AppPage) => void }) {
  const { t } = useI18n();
  const navButton = (target: AppPage, icon: ReactElement, label: string) => (
    <Button key={target} className={`nav-button ${page === target ? "active" : ""}`} appearance="subtle"
      icon={icon} aria-current={page === target ? "page" : undefined} onClick={() => onPage(target)}>
      {label}
    </Button>
  );

  return <aside className="sidebar">
    <div className="sidebar-brand"><span className="brand-mark small">V</span><span>{t("appName")}</span></div>
    <nav className="sidebar-primary">
      {primary.map((item) => navButton(item.page, item.icon, t(item.key)))}
    </nav>
    <div className="sidebar-actions">
      {navButton("settings", <Settings24Regular />, t("settings"))}
    </div>
  </aside>;
}
