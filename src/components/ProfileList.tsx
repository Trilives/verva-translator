import { Badge, Button } from "@fluentui/react-components";
import { ChevronDown20Regular, ChevronRight20Regular } from "@fluentui/react-icons";
import type { ProviderProfile } from "../domain/types";
import { useI18n } from "../i18n/I18nContext";
import { ProfileEditor } from "./ProfileEditor";

interface Props {
  profiles: ProviderProfile[];
  activeId: string;
  /** Id of the row currently expanded into the full editor, if any. */
  expandedId?: string;
  onExpand: (id?: string) => void;
  onSave: (profile: ProviderProfile) => Promise<void> | void;
  onDelete: (profile: ProviderProfile) => void;
}

export function ProfileList({ profiles, activeId, expandedId, onExpand, onSave, onDelete }: Props) {
  const { t } = useI18n();

  return <div className="profile-list">
    {profiles.map((profile) => {
      const expanded = profile.id === expandedId;
      return <section key={profile.id} className={`profile-row ${expanded ? "expanded" : ""}`}>
        <button type="button" className="profile-summary press" aria-expanded={expanded}
          onClick={() => onExpand(expanded ? undefined : profile.id)}>
          {expanded ? <ChevronDown20Regular /> : <ChevronRight20Regular />}
          <span className="profile-name">{profile.name}</span>
          <span className="profile-meta">{profile.kind === "openai" ? t("openAi") : t("claude")} · {profile.model}</span>
          {profile.id === activeId && <Badge appearance="tint" color="brand">{t("activeProfile")}</Badge>}
          {!profile.hasApiKey && <Badge appearance="tint" color="warning">{t("apiKeyMissing")}</Badge>}
        </button>
        {expanded && <div className="profile-body">
          <ProfileEditor
            profile={profile}
            canDelete={profiles.length > 1}
            onSave={async (next) => { await onSave(next); onExpand(undefined); }}
            onDelete={() => onDelete(profile)}
          />
        </div>}
      </section>;
    })}
  </div>;
}
