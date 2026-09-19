"use client";

import * as React from "react";

export const SETTINGS_AUTO_SAVE_MS = 600;

export function settingsFormKey(values: Record<string, string>): string {
  return Object.keys(values)
    .sort()
    .map((key) => `${key}=${values[key] ?? ""}`)
    .join("&");
}

export function toSettingsFormData(values: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(values)) {
    formData.set(key, value);
  }
  return formData;
}

export function useSettingsAutoSave(
  action: (formData: FormData) => void | Promise<void>,
  initial: Record<string, string>,
) {
  const lastKey = React.useRef(settingsFormKey(initial));
  const latest = React.useRef(initial);
  const actionRef = React.useRef(action);
  const timer = React.useRef<ReturnType<typeof setTimeout>>(undefined);
  actionRef.current = action;

  const commit = React.useCallback((values: Record<string, string>) => {
    const key = settingsFormKey(values);
    if (key === lastKey.current) return;
    lastKey.current = key;
    actionRef.current(toSettingsFormData(values));
  }, []);

  const cancel = React.useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const saveNow = React.useCallback(
    (values: Record<string, string>) => {
      latest.current = values;
      cancel();
      commit(values);
    },
    [cancel, commit],
  );

  const saveSoon = React.useCallback(
    (values: Record<string, string>) => {
      latest.current = values;
      cancel();
      timer.current = setTimeout(
        () => commit(latest.current),
        SETTINGS_AUTO_SAVE_MS,
      );
    },
    [cancel, commit],
  );

  React.useEffect(
    () => () => {
      if (!timer.current) return;
      clearTimeout(timer.current);
      commit(latest.current);
    },
    [commit],
  );

  return { saveNow, saveSoon, cancel };
}
