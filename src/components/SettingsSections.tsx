import { Button, Radio, RadioGroup } from "@fluentui/react-components";
import { ArrowSync20Regular } from "@fluentui/react-icons";
import type { AppSettings, UiLocale, UpdateChannel } from "../domain/types";
import { useI18n } from "../i18n/I18nContext";
import { ShortcutRecorder } from "./ShortcutRecorder";

type Update = (value: AppSettings) => Promise<void>;

export function GeneralSection({ settings, update }: { settings: AppSettings; update: Update }) {
  const { t } = useI18n();
  return <div className="settings-stack">
    <section className="settings-card">
      <h2>{t("interfaceLanguage")}</h2>
      <RadioGroup value={settings.locale} onChange={(_, d) => update({ ...settings, locale: d.value as UiLocale })}>
        <Radio value="en" label={t("english")} />
        <Radio value="zh-CN" label={t("chinese")} />
      </RadioGroup>
    </section>
    <section className="settings-card">
      <h2>{t("appearance")}</h2>
      <RadioGroup value={settings.theme} onChange={(_, d) => update({ ...settings, theme: d.value as AppSettings["theme"] })}>
        <Radio value="system" label={t("system")} />
        <Radio value="light" label={t("light")} />
        <Radio value="dark" label={t("dark")} />
      </RadioGroup>
    </section>
  </div>;
}

export function UpdatesSection({ settings, update, status, onCheck }: { settings: AppSettings; update: Update; status: string; onCheck: () => void }) {
  const { t } = useI18n();
  return <div className="settings-stack">
    <section className="settings-card">
      <h2>{t("updates")}</h2>
      <RadioGroup value={settings.updateMode} onChange={(_, d) => update({ ...settings, updateMode: d.value as AppSettings["updateMode"] })}>
        <Radio value="automatic" label={t("automatic")} />
        <Radio value="manual" label={t("manual")} />
      </RadioGroup>
    </section>
    <section className="settings-card">
      <h2>{t("channel")}</h2>
      <RadioGroup value={settings.updateChannel} onChange={(_, d) => update({ ...settings, updateChannel: d.value as UpdateChannel })}>
        <Radio value="stable" label={t("stable")} />
        <Radio value="beta" label={t("beta")} />
      </RadioGroup>
      <div className="settings-card-actions">
        <Button icon={<ArrowSync20Regular />} onClick={onCheck}>{t("checkUpdates")}</Button>
        {status && <span className="settings-status">{status}</span>}
      </div>
      <p className="settings-note">{t("portableNotice")}</p>
    </section>
  </div>;
}

const SHORTCUT_DEFAULTS = { translate: "Ctrl+Enter", clear: "Ctrl+L", copy: "Ctrl+Shift+C" } as const;

export function ShortcutsSection({ settings, update }: { settings: AppSettings; update: Update }) {
  const { t } = useI18n();
  const set = (key: keyof AppSettings["shortcuts"], value: string) =>
    update({ ...settings, shortcuts: { ...settings.shortcuts, [key]: value } });
  return <div className="settings-stack">
    <section className="settings-card">
      <h2>{t("shortcuts")}</h2>
      <p className="settings-note">{t("shortcutsHint")}</p>
      <div className="form-grid">
        {(["translate", "clear", "copy"] as const).map((action) => (
          <ShortcutRecorder key={action} label={t(action)} value={settings.shortcuts[action]}
            fallback={SHORTCUT_DEFAULTS[action]} onChange={(value) => set(action, value)} />
        ))}
      </div>
    </section>
  </div>;
}
