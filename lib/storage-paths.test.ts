import { describe, expect, it } from "vitest";

import { publicObjectUrl, STORAGE_BUCKETS } from "@/lib/storage-constants";
import {
  buildProfileAvatarPath,
  buildWorkspaceLogoPath,
  isProfileAvatarPath,
  isWorkspaceLogoPath,
} from "@/lib/storage-paths";

const USER = "11111111-1111-4111-8111-111111111111";
const WS = "22222222-2222-4222-8222-222222222222";

describe("storage paths", () => {
  it("builds profile and workspace object paths", () => {
    const avatar = buildProfileAvatarPath(USER, "me.PNG");
    expect(avatar).toMatch(new RegExp(`^profiles/${USER}/[0-9a-f-]+\\.png$`));
    expect(isProfileAvatarPath(avatar, USER)).toBe(true);
    expect(isProfileAvatarPath(avatar, WS)).toBe(false);

    const logo = buildWorkspaceLogoPath(WS, "mark");
    expect(logo.startsWith(`workspaces/${WS}/`)).toBe(true);
    expect(isWorkspaceLogoPath(logo, WS)).toBe(true);
  });

  it("rejects traversal and the other namespace", () => {
    expect(isProfileAvatarPath(`profiles/${USER}/../x.png`, USER)).toBe(false);
    expect(isWorkspaceLogoPath(`workspaces/${WS}/nested/file.png`, WS)).toBe(
      false,
    );
    expect(isProfileAvatarPath(`workspaces/${USER}/a.png`, USER)).toBe(false);
  });

  it("builds a public object URL from a path", () => {
    expect(
      publicObjectUrl(
        STORAGE_BUCKETS.avatars,
        `profiles/${USER}/pic.webp`,
        "http://127.0.0.1:54321",
      ),
    ).toBe(
      `http://127.0.0.1:54321/storage/v1/object/public/avatars/profiles/${USER}/pic.webp`,
    );
    expect(
      publicObjectUrl(STORAGE_BUCKETS.avatars, null, "http://127.0.0.1:54321"),
    ).toBeNull();
    expect(
      publicObjectUrl(
        STORAGE_BUCKETS.avatars,
        "https://cdn.example/pic.png",
        "http://127.0.0.1:54321",
      ),
    ).toBe("https://cdn.example/pic.png");
  });
});
