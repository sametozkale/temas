import {
  Building03Icon,
  Calendar03Icon,
  Home01Icon,
  InboxIcon,
  Settings02Icon,
  type IconSvgElement,
} from "@/components/icons";

export type NavKey = "home" | "inbox" | "calendar" | "properties" | "settings";

export type NavItem = {
  key: NavKey;
  href: string;
  icon: IconSvgElement;
};

/** Primary sidebar navigation (docs/00 §4). Labels come from `nav.*` messages. */
export const primaryNav: NavItem[] = [
  { key: "home", href: "/home", icon: Home01Icon },
  { key: "inbox", href: "/inbox", icon: InboxIcon },
  { key: "calendar", href: "/calendar", icon: Calendar03Icon },
  { key: "properties", href: "/properties", icon: Building03Icon },
  { key: "settings", href: "/settings", icon: Settings02Icon },
];
