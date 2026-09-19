import {
  Building03Icon,
  Calendar03Icon,
  CheckmarkSquare02Icon,
  Home01Icon,
  Home04Icon,
  InboxIcon,
  type IconSvgElement,
} from "@/components/icons";

export type NavKey = "home" | "inbox" | "calendar" | "tasks" | "properties";

export type NavItem = {
  key: NavKey;
  href: string;
  icon: IconSvgElement;
  /** Stroke variant shown while this item is the current page. */
  activeIcon?: IconSvgElement;
};

/** Primary sidebar navigation (docs/00 §4). Labels come from `nav.*` messages. */
export const primaryNav: NavItem[] = [
  { key: "home", href: "/home", icon: Home01Icon, activeIcon: Home04Icon },
  { key: "inbox", href: "/inbox", icon: InboxIcon },
  { key: "calendar", href: "/calendar", icon: Calendar03Icon },
  { key: "tasks", href: "/tasks", icon: CheckmarkSquare02Icon },
  { key: "properties", href: "/properties", icon: Building03Icon },
];
