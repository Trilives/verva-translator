import { Badge, Button } from "@fluentui/react-components";
import { ChevronDown20Regular, ChevronRight20Regular } from "@fluentui/react-icons";
import type { ProviderProfile } from "../domain/types";
import { isLanBaseUrl } from "../domain/providerUrl";
import { useI18n } from "../i18n/I18nContext";
import { ProfileEditor } from "./ProfileEditor";

interface Props {
  profiles: ProviderProfile[];
  activeId: string;
  /** Id of the row currently expanded into the full editor, if any. */
  expandedId?: string;
  onExpand: (id?: string) => void;
  keyDrafts: Record<string, string>;
  onKeyDraft: (id: string, value: string) => void;
  onSaveKey: (profile: ProviderProfile) => Promise<void>;
  onChange: (id: string, changes: Partial<ProviderProfile>) => void;
  onDelete: (profile: ProviderProfile) => void;
}

export function ProfileList(props: Props) {
  const { t } = useI18n();

  return <div className="profile-list">
    {props.profiles.map((profile) => {
      const expanded = profile.id === props.expandedId;
      return <section key={profile.id} className={`profile-row ${expanded ? "expanded" : ""}`}>
        <button type="button" className="profile-summary press" aria-expanded={expanded}
          onClick={() => props.onExpand(expanded ? undefined : profile.id)}>
          {expanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
          <span className="profile-name">{profile.name}</span>
          <span className="profile-meta">{profile.kind === "openai" ? t("openAi") : t("claude")} · {profile.model}</span>
          {profile.id === props.activeId && <Badge appearance="tint" color="brand">{t("activeProfile")}</Badge>}
          {!profile.hasApiKey && !isLanBaseUrl(profile.baseUrl)
            && <Badge appearance="tint" color="warning">{t("apiKeyMissing")}</Badge>}
        </button>
        {expanded && <div className="profile-body">
          <ProfileEditor
            profile={profile}
            canDelete={props.profiles.length > 1}
            apiKeyDraft={props.keyDrafts[profile.id] ?? ""}
            onApiKeyDraft={(value) => props.onKeyDraft(profile.id, value)}
            onSaveKey={() => props.onSaveKey(profile)}
            onChange={(changes) => props.onChange(profile.id, changes)}
            onDelete={() => props.onDelete(profile)}
          />
        </div>}
      </section>;
    })}
  </div>;
}
