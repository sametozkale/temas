/** Fields from a Google Calendar event resource, kept off the fetch client. */

export type GoogleGuestResponse =
  | "accepted"
  | "declined"
  | "tentative"
  | "needsAction";

export type GoogleEventGuest = {
  email: string;
  name: string | null;
  response: GoogleGuestResponse;
  organizer: boolean;
  self: boolean;
};

export type GoogleEventDetails = {
  description: string | null;
  meetUrl: string | null;
  htmlUrl: string | null;
  guests: GoogleEventGuest[];
};

type EventResource = {
  description?: string;
  location?: string;
  hangoutLink?: string;
  htmlLink?: string;
  conferenceData?: {
    entryPoints?: { entryPointType?: string; uri?: string }[];
  };
  attendees?: {
    email?: string;
    displayName?: string;
    responseStatus?: string;
    organizer?: boolean;
    self?: boolean;
  }[];
};

export function safeHttpUrl(value: string | null | undefined) {
  const raw = value?.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function guestResponse(value: string | undefined): GoogleGuestResponse {
  if (
    value === "accepted" ||
    value === "declined" ||
    value === "tentative" ||
    value === "needsAction"
  ) {
    return value;
  }
  return "needsAction";
}

export function readGoogleEventDetails(item: EventResource): GoogleEventDetails {
  const video = item.conferenceData?.entryPoints?.find(
    (entry) => entry.entryPointType === "video" && entry.uri,
  );
  const description = item.description?.trim().slice(0, 4000) || null;
  const guests = (item.attendees ?? [])
    .filter((guest) => guest.email?.trim())
    .map((guest) => ({
      email: guest.email!.trim(),
      name: guest.displayName?.trim() || null,
      response: guestResponse(guest.responseStatus),
      organizer: guest.organizer === true,
      self: guest.self === true,
    }))
    .sort((a, b) => Number(b.organizer) - Number(a.organizer));

  return {
    description,
    meetUrl: safeHttpUrl(video?.uri) ?? safeHttpUrl(item.hangoutLink),
    htmlUrl: safeHttpUrl(item.htmlLink),
    guests,
  };
}
