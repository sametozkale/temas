"use client";

import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as React from "react";
import { toast } from "sonner";

import {
  Building02Icon,
  Building03Icon,
  Clock01Icon,
  Image01Icon,
  Mail01Icon,
  PencilEdit01Icon,
  SmartPhone01Icon,
  UserIcon,
} from "@/components/icons";
import { ImageUploadControl } from "@/components/settings/image-upload-control";
import {
  SettingsGroup,
  SettingsItem,
} from "@/components/settings/settings-chrome";
import { FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { TimezoneSelect } from "@/components/timezone-select";
import { useSettingsAutoSave } from "@/lib/settings-auto-save";
import { STORAGE_BUCKETS } from "@/lib/storage-constants";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

import {
  attachAvatar,
  attachLogo,
  createAvatarUploadUrl,
  createLogoUploadUrl,
  removeAvatar,
  removeLogo,
  updateProfile,
  updateWorkspace,
  type SettingsState,
} from "./actions";

function useSettingsSubmit(
  action: (
    prev: SettingsState | undefined,
    formData: FormData,
  ) => Promise<SettingsState>,
  savedMessage: string,
) {
  const t = useTranslations("common");
  const [errors, setErrors] = React.useState<
    Record<string, string[]> | undefined
  >();

  const submit = React.useCallback(
    async (formData: FormData) => {
      const result = await action(undefined, formData);
      if (result.ok) {
        setErrors(undefined);
        toast.success(savedMessage);
        return;
      }
      setErrors(result.fieldErrors);
      if (result.error !== "invalid") toast.error(t("error_generic"));
    },
    [action, savedMessage, t],
  );

  return { submit, errors };
}

async function uploadImage(
  file: File,
  createUrl: typeof createAvatarUploadUrl,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  const signed = await createUrl({
    fileName: file.name,
    contentType: file.type,
    size: file.size,
  });
  if (!signed.ok || !signed.data) {
    return { ok: false, error: signed.ok ? "upload_failed" : signed.error };
  }
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage
    .from(STORAGE_BUCKETS.avatars)
    .uploadToSignedUrl(signed.data.path, signed.data.token, file, {
      contentType: file.type,
    });
  if (error) return { ok: false, error: "upload_failed" };
  return { ok: true, path: signed.data.path };
}

function failUpload(
  t: ReturnType<typeof useTranslations<"settings.general">>,
  error?: string,
) {
  if (error === "unsupported_type" || error === "too_large") {
    toast.error(t(`errors.${error}`));
    return;
  }
  toast.error(t("errors.upload_failed"));
}

export function WorkspaceForm({
  name,
  legalName,
  timezone,
  logoUrl,
  initials,
  canEdit,
}: {
  name: string;
  legalName: string;
  timezone: string;
  logoUrl: string | null;
  initials: string;
  canEdit: boolean;
}) {
  const t = useTranslations("settings.general");
  const router = useRouter();
  const [wsName, setWsName] = React.useState(name);
  const [wsLegalName, setWsLegalName] = React.useState(legalName);
  const [wsTimezone, setWsTimezone] = React.useState(timezone);
  const [nameTooShort, setNameTooShort] = React.useState(false);
  const { submit, errors } = useSettingsSubmit(updateWorkspace, t("saved"));
  const { saveNow, saveSoon, cancel } = useSettingsAutoSave(submit, {
    name,
    legalName,
    timezone,
  });

  function persistWorkspace(
    next: { name: string; legalName: string; timezone: string },
    mode: "now" | "soon",
  ) {
    if (next.name.trim().length < 2) {
      cancel();
      if (mode === "now") setNameTooShort(true);
      return;
    }
    setNameTooShort(false);
    if (mode === "now") saveNow(next);
    else saveSoon(next);
  }

  async function handlePick(file: File) {
    const uploaded = await uploadImage(file, createLogoUploadUrl);
    if (!uploaded.ok) {
      failUpload(t, uploaded.error);
      return;
    }
    const attached = await attachLogo(uploaded.path);
    if (!attached.ok) {
      failUpload(t, attached.error);
      return;
    }
    router.refresh();
  }

  async function handleRemove() {
    const result = await removeLogo();
    if (!result.ok) {
      failUpload(t, result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (canEdit)
          persistWorkspace(
            { name: wsName, legalName: wsLegalName, timezone: wsTimezone },
            "now",
          );
      }}
    >
      <SettingsGroup footer={!canEdit ? t("owner_only") : undefined}>
        <SettingsItem
          icon={Image01Icon}
          title={t("logo")}
          description={t("logo_description")}
        >
          <ImageUploadControl
            imageUrl={logoUrl}
            initials={initials}
            shape="square"
            disabled={!canEdit}
            changeLabel={t("change_photo")}
            removeLabel={t("remove_photo")}
            onPick={handlePick}
            onRemove={canEdit ? handleRemove : undefined}
            onInvalid={(reason) => toast.error(t(`errors.${reason}`))}
          />
        </SettingsItem>
        <SettingsItem
          icon={Building03Icon}
          title={t("workspace_name")}
          description={t("name_description")}
        >
          <div className="w-full sm:w-52">
            <Input
              id="ws-name"
              name="name"
              value={wsName}
              disabled={!canEdit}
              required
              aria-invalid={errors?.name || nameTooShort ? true : undefined}
              onChange={(event) => {
                const next = event.target.value;
                setWsName(next);
                persistWorkspace(
                  { name: next, legalName: wsLegalName, timezone: wsTimezone },
                  "soon",
                );
              }}
              onBlur={(event) =>
                persistWorkspace(
                  {
                    name: event.target.value,
                    legalName: wsLegalName,
                    timezone: wsTimezone,
                  },
                  "now",
                )
              }
            />
            {errors?.name || nameTooShort ? (
              <FieldError>{t("errors.name")}</FieldError>
            ) : null}
          </div>
        </SettingsItem>
        <SettingsItem
          icon={Building02Icon}
          title={t("legal_name")}
          description={t("legal_name_description")}
        >
          <div className="w-full sm:w-52">
            {canEdit ? (
              <>
                <Input
                  id="ws-legal-name"
                  name="legalName"
                  value={wsLegalName}
                  aria-invalid={errors?.legalName ? true : undefined}
                  onChange={(event) => {
                    const next = event.target.value;
                    setWsLegalName(next);
                    persistWorkspace(
                      { name: wsName, legalName: next, timezone: wsTimezone },
                      "soon",
                    );
                  }}
                  onBlur={(event) =>
                    persistWorkspace(
                      {
                        name: wsName,
                        legalName: event.target.value,
                        timezone: wsTimezone,
                      },
                      "now",
                    )
                  }
                />
                {errors?.legalName ? (
                  <FieldError>{t("errors.legal_name")}</FieldError>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-muted-foreground sm:text-right">
                {legalName || t("legal_name_empty")}
              </p>
            )}
          </div>
        </SettingsItem>
        <SettingsItem
          icon={Clock01Icon}
          title={t("timezone")}
          description={t("timezone_description")}
        >
          {canEdit ? (
            <div className="w-full sm:w-52">
              <TimezoneSelect
                id="ws-tz"
                name="timezone"
                value={wsTimezone}
                onValueChange={(next) => {
                  setWsTimezone(next);
                  persistWorkspace(
                    { name: wsName, legalName: wsLegalName, timezone: next },
                    "now",
                  );
                }}
              />
            </div>
          ) : (
            <>
              <input type="hidden" name="timezone" value={timezone} />
              <p className="text-sm text-muted-foreground sm:text-right">
                {timezone}
              </p>
            </>
          )}
        </SettingsItem>
      </SettingsGroup>
    </form>
  );
}

export function ProfileForm({
  fullName,
  phone,
  signature,
  email,
  avatarUrl,
  initials,
}: {
  fullName: string;
  phone: string;
  signature: string;
  email: string;
  avatarUrl: string | null;
  initials: string;
}) {
  const t = useTranslations("settings.general");
  const router = useRouter();
  const [name, setName] = React.useState(fullName);
  const [phoneValue, setPhoneValue] = React.useState(phone);
  const [signatureValue, setSignatureValue] = React.useState(signature);
  const [nameTooShort, setNameTooShort] = React.useState(false);
  const { submit, errors } = useSettingsSubmit(updateProfile, t("saved"));
  const { saveNow, saveSoon, cancel } = useSettingsAutoSave(submit, {
    fullName,
    phone,
    signature,
  });

  function persistProfile(
    next: { fullName: string; phone: string; signature: string },
    mode: "now" | "soon",
  ) {
    if (next.fullName.trim().length < 2) {
      cancel();
      if (mode === "now") setNameTooShort(true);
      return;
    }
    setNameTooShort(false);
    if (mode === "now") saveNow(next);
    else saveSoon(next);
  }

  const profileValues = {
    fullName: name,
    phone: phoneValue,
    signature: signatureValue,
  };

  async function handlePick(file: File) {
    const uploaded = await uploadImage(file, createAvatarUploadUrl);
    if (!uploaded.ok) {
      failUpload(t, uploaded.error);
      return;
    }
    const attached = await attachAvatar(uploaded.path);
    if (!attached.ok) {
      failUpload(t, attached.error);
      return;
    }
    router.refresh();
  }

  async function handleRemove() {
    const result = await removeAvatar();
    if (!result.ok) {
      failUpload(t, result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        persistProfile(profileValues, "now");
      }}
    >
      <SettingsGroup>
        <SettingsItem
          icon={Image01Icon}
          title={t("photo")}
          description={t("photo_description")}
        >
          <ImageUploadControl
            imageUrl={avatarUrl}
            initials={initials}
            changeLabel={t("change_photo")}
            removeLabel={t("remove_photo")}
            onPick={handlePick}
            onRemove={handleRemove}
            onInvalid={(reason) => toast.error(t(`errors.${reason}`))}
          />
        </SettingsItem>
        <SettingsItem
          icon={UserIcon}
          title={t("full_name")}
          description={t("full_name_description")}
        >
          <div className="w-full sm:w-52">
            <Input
              id="p-name"
              name="fullName"
              value={name}
              required
              aria-invalid={errors?.fullName || nameTooShort ? true : undefined}
              onChange={(event) => {
                const next = event.target.value;
                setName(next);
                persistProfile({ ...profileValues, fullName: next }, "soon");
              }}
              onBlur={(event) =>
                persistProfile(
                  { ...profileValues, fullName: event.target.value },
                  "now",
                )
              }
            />
            {errors?.fullName || nameTooShort ? (
              <FieldError>{t("errors.full_name")}</FieldError>
            ) : null}
          </div>
        </SettingsItem>
        <SettingsItem
          icon={Mail01Icon}
          title={t("email")}
          description={t("email_description")}
        >
          <div className="w-full sm:w-52">
            <Input id="p-email" value={email} disabled readOnly />
          </div>
        </SettingsItem>
        <SettingsItem
          icon={SmartPhone01Icon}
          title={t("phone")}
          description={t("phone_description")}
        >
          <div className="w-full sm:w-52">
            <Input
              id="p-phone"
              name="phone"
              value={phoneValue}
              onChange={(event) => {
                const next = event.target.value;
                setPhoneValue(next);
                persistProfile({ ...profileValues, phone: next }, "soon");
              }}
              onBlur={(event) =>
                persistProfile(
                  { ...profileValues, phone: event.target.value },
                  "now",
                )
              }
            />
          </div>
        </SettingsItem>
        <SettingsItem
          icon={PencilEdit01Icon}
          title={t("signature")}
          description={t("signature_description")}
          control="below"
        >
          <Textarea
            id="p-signature"
            name="signature"
            rows={4}
            value={signatureValue}
            placeholder={t("signature_placeholder")}
            aria-invalid={errors?.signature ? true : undefined}
            onChange={(event) => {
              const next = event.target.value;
              setSignatureValue(next);
              persistProfile({ ...profileValues, signature: next }, "soon");
            }}
            onBlur={(event) =>
              persistProfile(
                { ...profileValues, signature: event.target.value },
                "now",
              )
            }
          />
          {errors?.signature ? (
            <FieldError>{t("errors.signature")}</FieldError>
          ) : null}
        </SettingsItem>
      </SettingsGroup>
    </form>
  );
}
