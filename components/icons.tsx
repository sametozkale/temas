/**
 * Central icon registry — the ONLY place that may import from @hugeicons/*.
 * Everywhere else: `import { Icon, Home01Icon } from "@/components/icons"`.
 *
 * Rules (docs/01-design-system.md §5): free set only, stroke style,
 * strokeWidth 1.5, sizes 16/18/20. Never emoji.
 */
import * as React from "react";
import {
  HugeiconsIcon,
  type HugeiconsIconProps,
  type IconSvgElement,
} from "@hugeicons/react";

export type { IconSvgElement };

export type IconProps = Omit<HugeiconsIconProps, "size"> & {
  size?: 16 | 18 | 20 | 24 | 48;
};

/** Thin wrapper that fixes the stroke width and default size. */
export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ size = 18, strokeWidth = 1.5, ...props }, ref) => (
    <HugeiconsIcon ref={ref} size={size} strokeWidth={strokeWidth} {...props} />
  ),
);
Icon.displayName = "Icon";

export {
  // Sidebar navigation
  Home01Icon,
  Home04Icon,
  InboxIcon,
  Calendar03Icon,
  Building03Icon,
  Settings02Icon,
  ChatFeedbackIcon,

  // Property types (docs/01 §5)
  House01Icon,
  Store01Icon,
  WarehouseIcon,
  MapsIcon,
  Building02Icon,

  // AI actions
  AiMagicIcon,
  SparklesIcon,

  // Feedback / status
  Alert02Icon,
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
  Loading03Icon,
  CancelCircleIcon,
  Tick02Icon,
  CheckmarkSquare02Icon,
  CircleIcon,
  SignalLow01Icon,
  SignalMedium01Icon,
  SignalHighIcon,

  // Common actions
  Add01Icon,
  PlusSignIcon,
  MinusSignIcon,
  Cancel01Icon,
  Search01Icon,
  FilterIcon,
  Edit02Icon,
  PencilEdit01Icon,
  Delete02Icon,
  Copy01Icon,
  Link01Icon,
  Upload01Icon,
  Download01Icon,
  SentIcon,
  Attachment01Icon,
  MoreHorizontalIcon,
  MoreVerticalIcon,
  Menu01Icon,
  Logout01Icon,

  // Sidebar chrome
  SidebarLeftIcon,

  // Navigation arrows
  ArrowRight01Icon,
  ArrowLeft01Icon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUp02Icon,

  // Domain
  UserIcon,
  UserGroupIcon,
  File01Icon,
  Image01Icon,
  Clock01Icon,
  Calendar01Icon,
  Mail01Icon,
  InboxUnreadIcon,
  SpamIcon,
  WhatsappIcon,
  BubbleChatIcon,
  SmartPhone01Icon,
  Location01Icon,
  Notification01Icon,

  // Properties area (PHASE 2)
  ApartmentIcon,
  ArchiveIcon,
  LayoutGridIcon,
  LayoutListIcon,
  Image02Icon,
  ImageUpload01Icon,
  CloudUploadIcon,
  Sofa01Icon,
  Folder01Icon,
  Activity01Icon,
  StarIcon,
  UserAdd01Icon,
  UserCheck01Icon,
  Share08Icon,
  SquareLock01Icon,
  SquareUnlock01Icon,
  Money01Icon,
  RulerIcon,
  Door01Icon,
  Globe02Icon,
  ArrowLeft02Icon,
  ArrowRight02Icon,
  ArrowReloadHorizontalIcon,
  Package01Icon,
  Tag01Icon,
  Sun03Icon,
  Moon02Icon,
  ContrastIcon,
  ComputerIcon,
} from "@hugeicons/core-free-icons";
