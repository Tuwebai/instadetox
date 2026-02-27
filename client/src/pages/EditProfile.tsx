import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/AuthContext";
import { useEditProfileForm } from "@/hooks/useEditProfileForm";
import { useAccountPrivacySettings } from "@/hooks/useAccountPrivacySettings";
import EditProfileSidebar, { type EditSettingsTab } from "@/components/edit-profile/EditProfileSidebar";
import EditProfileForm from "@/components/edit-profile/EditProfileForm";
import AccountPrivacyTab from "@/components/edit-profile/AccountPrivacyTab";
import type { AuthUser } from "@/lib/AuthContext";

const EditProfileContent = ({
  user,
  updateUserProfile,
}: {
  user: AuthUser;
  updateUserProfile: (patch: Partial<Pick<AuthUser, "username" | "full_name" | "avatar_url" | "website">>) => void;
}) => {
  const { toast } = useToast();

  const notify = ({ title, description }: { title: string; description: string }) => {
    toast({ title, description });
  };

  const [activeTab, setActiveTab] = useState<EditSettingsTab>("edit-profile");
  const { saving, avatarBusy, values, errors, hasChanges, setField, handleAvatarFileChange, save } = useEditProfileForm({
    user,
    updateUserProfile,
    notify,
  });

  const {
    isPrivate,
    saving: privacySaving,
    togglePrivacy,
  } = useAccountPrivacySettings({
    user,
    notify,
  });

  return (
    <div className="w-full max-w-6xl mx-auto py-2 sm:py-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start">
        <EditProfileSidebar activeTab={activeTab} onChangeTab={setActiveTab} />

        <div className="flex-1">
          {activeTab === "edit-profile" ? (
            <EditProfileForm
              user={user}
              values={values}
              errors={errors}
              saving={saving}
              avatarBusy={avatarBusy}
              hasChanges={hasChanges}
              onFieldChange={setField}
              onAvatarFileChange={handleAvatarFileChange}
              onSave={save}
            />
          ) : null}

          {activeTab === "privacy" ? (
            <AccountPrivacyTab
              isPrivate={isPrivate}
              saving={privacySaving}
              onToggle={(next) => void togglePrivacy(next)}
            />
          ) : null}

          {(activeTab === "notifications" || activeTab === "security") ? (
            <section className="rounded-2xl border border-white/15 bg-slate-950/40 backdrop-blur-xl p-6 text-sm text-gray-300">
              Esta sección se habilitará en la siguiente iteración.
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
};

const EditProfile = () => {
  const { user, updateUserProfile } = useAuth();
  if (!user) return null;
  return <EditProfileContent user={user} updateUserProfile={updateUserProfile} />;
};

export default EditProfile;
