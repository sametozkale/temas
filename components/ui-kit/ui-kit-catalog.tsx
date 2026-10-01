"use client";

import * as React from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import { toast } from "sonner";

import { AiLanguageSelect } from "@/components/ai-language-select";
import { CurrencySelect } from "@/components/currency-select";
import { EmptyState } from "@/components/empty-state";
import { EventChip } from "@/components/event-chip";
import { PageHeader } from "@/components/page-header";
import { PlanInterval } from "@/components/plan-interval";
import { PromptBar } from "@/components/prompt-bar";
import {
  PropertyStatusBadge,
  PropertyStatusDot,
  PropertyTypeLabel,
} from "@/components/properties/property-badges";
import { SearchSelect } from "@/components/search-select";
import { TaskPriorityIcon } from "@/components/tasks/priority-icon";
import { TimezoneSelect } from "@/components/timezone-select";
import { CalendarEventPill } from "@/components/calendar/event-pill";
import { PersonAvatar, WorkspaceMark } from "@/components/identity-marks";
import { Button } from "@/components/ui/button";
import {
  Add01Icon,
  ArrowRight01Icon,
  Calendar01Icon,
  CheckmarkCircle02Icon,
  Copy01Icon,
  Download01Icon,
  FilterIcon,
  Icon,
  Mail01Icon,
  MoreHorizontalIcon,
  Moon02Icon,
  Search01Icon,
  Settings02Icon,
  Sun03Icon,
  Upload01Icon,
  UserAdd01Icon,
} from "@/components/icons";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Avatar,
  AvatarBadge,
  AvatarFallback,
  AvatarGroup,
  AvatarGroupCount,
  AvatarImage,
} from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Calendar } from "@/components/ui/calendar";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Field,
  FieldContent,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldLegend,
  FieldSeparator,
  FieldSet,
  FieldTitle,
} from "@/components/ui/field";
import { FileInput } from "@/components/ui/file-input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
  InputGroupText,
  InputGroupTextarea,
} from "@/components/ui/input-group";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NumberField } from "@/components/ui/number-field";
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableFooter,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TimePicker } from "@/components/ui/time-picker";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navigation = [
  {
    label: "Foundations",
    items: [
      { id: "colors", label: "Colors" },
      { id: "typography", label: "Typography" },
      { id: "icons", label: "Icons" },
    ],
  },
  {
    label: "Actions",
    items: [
      { id: "buttons", label: "Buttons" },
      { id: "badges", label: "Badges" },
      { id: "avatars", label: "Avatars" },
    ],
  },
  {
    label: "Forms & selection",
    items: [
      { id: "input", label: "Input & textarea" },
      { id: "field", label: "Field composition" },
      { id: "input-group", label: "Input group" },
      { id: "file-input", label: "File input" },
      { id: "number-field", label: "Number field" },
      { id: "select", label: "Select" },
      { id: "checkbox", label: "Checkbox" },
      { id: "radio-group", label: "Radio group" },
      { id: "switch", label: "Switch" },
      { id: "tabs", label: "Tabs" },
      { id: "calendar", label: "Calendar" },
      { id: "date-time", label: "Date & time pickers" },
      { id: "search-select", label: "Search select" },
      { id: "currency-select", label: "Currency select" },
      { id: "timezone-select", label: "Timezone select" },
      { id: "ai-language-select", label: "AI language select" },
    ],
  },
  {
    label: "Navigation & surfaces",
    items: [
      { id: "breadcrumb", label: "Breadcrumb" },
      { id: "dropdown-menu", label: "Dropdown menu" },
      { id: "context-menu", label: "Context menu" },
      { id: "tooltip", label: "Tooltip" },
      { id: "card", label: "Card" },
      { id: "table", label: "Table" },
      { id: "skeleton", label: "Skeleton" },
      { id: "scroll-area", label: "Scroll area" },
      { id: "command", label: "Command palette" },
    ],
  },
  {
    label: "Overlays & feedback",
    items: [
      { id: "dialog", label: "Dialog" },
      { id: "alert-dialog", label: "Alert dialog" },
      { id: "sheet", label: "Sheet" },
      { id: "popover", label: "Popover" },
      { id: "toast", label: "Toast notifications" },
      { id: "separator", label: "Separator" },
    ],
  },
  {
    label: "Shared patterns",
    items: [
      { id: "prompt-bar", label: "Prompt bar" },
      { id: "event-chip", label: "Event chip" },
      { id: "calendar-event", label: "Calendar event" },
      { id: "page-header", label: "Page header" },
      { id: "empty-state", label: "Empty state" },
      { id: "plan-interval", label: "Plan interval" },
      { id: "task-priority", label: "Task priority" },
      { id: "property-status", label: "Property status" },
      { id: "property-type", label: "Property type" },
    ],
  },
];

const surfaceTokens = [
  ["background", "Background", "bg-background"],
  ["foreground", "Foreground", "bg-foreground"],
  ["card", "Card", "bg-card"],
  ["card-foreground", "Card foreground", "bg-card-foreground"],
  ["popover", "Popover", "bg-popover"],
  ["popover-foreground", "Popover foreground", "bg-popover-foreground"],
  ["primary", "Primary", "bg-primary"],
  ["primary-foreground", "Primary foreground", "bg-primary-foreground"],
  ["secondary", "Secondary", "bg-secondary"],
  ["secondary-foreground", "Secondary foreground", "bg-secondary-foreground"],
  ["muted", "Muted", "bg-muted"],
  ["muted-foreground", "Muted foreground", "bg-muted-foreground"],
  ["accent", "Accent", "bg-accent"],
  ["accent-foreground", "Accent foreground", "bg-accent-foreground"],
  ["destructive", "Destructive", "bg-destructive"],
  [
    "destructive-foreground",
    "Destructive foreground",
    "bg-destructive-foreground",
  ],
  ["border", "Border", "bg-border"],
  ["input", "Input", "bg-input"],
  ["ring", "Ring", "bg-ring"],
  ["frame", "Frame", "bg-frame"],
] as const;

const semanticTokens = [
  ["brand", "Brand", "bg-brand"],
  ["brand-soft", "Brand soft", "bg-brand-soft"],
  ["brand-foreground", "Brand foreground", "bg-brand-foreground"],
  ["success", "Success", "bg-success"],
  ["success-soft", "Success soft", "bg-success-soft"],
  ["success-foreground", "Success foreground", "bg-success-foreground"],
  ["warning", "Warning", "bg-warning"],
  ["warning-soft", "Warning soft", "bg-warning-soft"],
  ["warning-foreground", "Warning foreground", "bg-warning-foreground"],
  ["info", "Info", "bg-info"],
  ["info-soft", "Info soft", "bg-info-soft"],
  ["info-foreground", "Info foreground", "bg-info-foreground"],
] as const;

const chartTokens = [
  ["chart-1", "Chart 1", "bg-chart-1"],
  ["chart-2", "Chart 2", "bg-chart-2"],
  ["chart-3", "Chart 3", "bg-chart-3"],
  ["chart-4", "Chart 4", "bg-chart-4"],
  ["chart-5", "Chart 5", "bg-chart-5"],
] as const;

const sidebarTokens = [
  ["sidebar", "Sidebar", "bg-sidebar"],
  ["sidebar-foreground", "Sidebar foreground", "bg-sidebar-foreground"],
  ["sidebar-primary", "Sidebar primary", "bg-sidebar-primary"],
  [
    "sidebar-primary-foreground",
    "Sidebar primary foreground",
    "bg-sidebar-primary-foreground",
  ],
  ["sidebar-accent", "Sidebar accent", "bg-sidebar-accent"],
  [
    "sidebar-accent-foreground",
    "Sidebar accent foreground",
    "bg-sidebar-accent-foreground",
  ],
  ["sidebar-border", "Sidebar border", "bg-sidebar-border"],
  ["sidebar-ring", "Sidebar ring", "bg-sidebar-ring"],
] as const;

const iconSamples = [
  [Search01Icon, "Search"],
  [Add01Icon, "Add"],
  [Calendar01Icon, "Calendar"],
  [Mail01Icon, "Mail"],
  [FilterIcon, "Filter"],
  [Settings02Icon, "Settings"],
  [UserAdd01Icon, "Invite"],
  [Upload01Icon, "Upload"],
  [Download01Icon, "Download"],
  [Copy01Icon, "Copy"],
  [CheckmarkCircle02Icon, "Success"],
  [MoreHorizontalIcon, "More"],
] as const;

function SectionHeading({
  id,
  eyebrow,
  title,
  description,
  catalogGroup = false,
}: {
  id: string;
  eyebrow: string;
  title: string;
  description: string;
  catalogGroup?: boolean;
}) {
  return (
    <div
      id={id}
      data-catalog-group-heading={catalogGroup ? "" : undefined}
      className="scroll-mt-24 border-b pb-4"
    >
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {eyebrow}
      </p>
      <h2 className="mt-1 text-xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function SearchSelectPreview() {
  const [value, setValue] = React.useState("Tallinn");

  return (
    <SearchSelect
      value={value}
      options={["Tallinn", "Tartu", "Pärnu"]}
      onValueChange={setValue}
      placeholder="Choose a city"
      searchPlaceholder="Search cities…"
      emptyText="No cities found."
    />
  );
}

function PropertyTypeSelectPreview({
  size = "default",
  invalid = false,
  disabled = false,
}: {
  size?: "sm" | "default";
  invalid?: boolean;
  disabled?: boolean;
}) {
  return (
    <Select defaultValue="apartment" disabled={disabled}>
      <SelectTrigger
        aria-invalid={invalid || undefined}
        aria-label="Property type"
        className="w-64"
        size={size}
      >
        <SelectValue placeholder="Choose a property type" />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Residential</SelectLabel>
          <SelectItem value="apartment">Apartment</SelectItem>
          <SelectItem value="house">House</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Commercial</SelectLabel>
          <SelectItem value="office">Office</SelectItem>
          <SelectItem value="shop">Shop</SelectItem>
          <SelectItem value="warehouse">Warehouse</SelectItem>
        </SelectGroup>
        <SelectSeparator />
        <SelectGroup>
          <SelectLabel>Other</SelectLabel>
          <SelectItem value="land">Land</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

function PlanIntervalPreview() {
  const [value, setValue] = React.useState<"month" | "year">("year");

  return (
    <PlanInterval
      value={value}
      onChange={setValue}
      label="Billing interval"
      month="Monthly"
      year="Yearly"
    />
  );
}

function Specimen({
  id,
  title,
  description,
  children,
}: {
  id?: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const hasVariantPicker =
    React.isValidElement(children) && children.type === VariantPreview;

  return (
    <article
      id={id}
      data-catalog-item={id ?? undefined}
      className="flex min-h-0 min-w-0 flex-1 scroll-mt-24 flex-col gap-4"
    >
      <div className="pt-4">
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {hasVariantPicker ? (
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      ) : (
        <div
          data-preview-stage
          className="flex min-h-[400px] flex-1 items-center justify-center rounded-2xl border border-border/70 bg-card/80 p-6 sm:p-10"
        >
          {children}
        </div>
      )}
    </article>
  );
}

function VariantPreview({
  options,
}: {
  options: Array<{
    value: string;
    label: string;
    preview: React.ReactNode;
  }>;
}) {
  const [value, setValue] = React.useState(options[0]?.value ?? "");
  const selectedOption = options.find((option) => option.value === value);

  return (
    <div
      data-preview-stage
      className="relative flex min-h-[400px] flex-1 items-center justify-center rounded-2xl border border-border/70 bg-card/80 p-8 sm:p-12"
    >
      <div className="absolute top-4 left-4 z-10 w-52">
        <Select value={value} onValueChange={setValue}>
          <SelectTrigger aria-label="Preview variant" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div key={value} className="flex w-full items-center justify-center">
        {selectedOption?.preview}
      </div>
    </div>
  );
}

function ThemeModeSwitch() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setReady(true);
  }, []);

  const activeTheme =
    theme === "dark" || (theme === "system" && resolvedTheme === "dark")
      ? "dark"
      : "light";

  return (
    <div
      role="radiogroup"
      aria-label="Color theme"
      className="flex h-8 items-center gap-0.5 rounded-full bg-muted p-0.5"
    >
      {[
        { value: "light", label: "Light", icon: Sun03Icon },
        { value: "dark", label: "Dark", icon: Moon02Icon },
      ].map(({ value, label, icon }) => {
        const active = ready && activeTheme === value;

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={!ready}
            onClick={() => setTheme(value)}
            className={`inline-flex h-full cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors hover:text-foreground disabled:cursor-not-allowed ${
              active ? "bg-card text-foreground" : "text-muted-foreground"
            }`}
          >
            <Icon icon={icon} size={16} />
            {label}
          </button>
        );
      })}
    </div>
  );
}

function ColorSwatch({
  name,
  label,
  colorClass,
}: {
  name: string;
  label: string;
  colorClass: string;
}) {
  return (
    <div className="min-w-0 rounded-lg border bg-card p-2">
      <div
        className={`h-8 rounded-md border border-foreground/10 ${colorClass}`}
      />
      <p className="mt-2 truncate text-[11px] font-medium">{label}</p>
      <code className="mt-0.5 block truncate text-[10px] text-muted-foreground">
        {name}
      </code>
    </div>
  );
}

function ColorGroup({
  title,
  tokens,
}: {
  title: string;
  tokens: readonly (readonly [string, string, string])[];
}) {
  return (
    <div>
      <h4 className="mb-2 text-xs font-medium text-muted-foreground">
        {title}
      </h4>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
        {tokens.map(([name, label, colorClass]) => (
          <ColorSwatch
            key={name}
            name={`--${name}`}
            label={label}
            colorClass={colorClass}
          />
        ))}
      </div>
    </div>
  );
}

function ColorPalette() {
  return (
    <div className="space-y-3">
      <ColorGroup title="Surfaces & text" tokens={surfaceTokens} />
      <ColorGroup title="Semantic" tokens={semanticTokens} />
      <ColorGroup title="Charts" tokens={chartTokens} />
      <ColorGroup title="Sidebar" tokens={sidebarTokens} />
    </div>
  );
}

function TypographySpecimens() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="rounded-xl border bg-card p-3">
        <p className="text-xs font-medium text-muted-foreground">
          Sans · Inter · app-wide UI
        </p>
        <p className="mt-2 text-base">A quiet workspace for better letting.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Aa Bb Cc 0123456789
        </p>
      </div>
      <div className="rounded-xl border bg-card p-3">
        <p className="text-xs font-medium text-muted-foreground">
          Serif · Newsreader · titles
        </p>
        <p className="mt-2 font-serif text-xl">Homes find their people.</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Aa Bb Cc 0123456789
        </p>
      </div>
      <div className="rounded-xl border bg-card p-3">
        <p className="text-xs font-medium text-muted-foreground">
          Hand · Caveat · marketing captions
        </p>
        <p className="mt-2 font-hand text-2xl">A note from your team</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Aa Bb Cc 0123456789
        </p>
      </div>
      <div className="rounded-xl border bg-card p-3">
        <p className="text-xs font-medium text-muted-foreground">
          Mono · system stack · codes
        </p>
        <p className="mt-2 font-mono text-sm">REF-1048 · 09:30</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Aa Bb Cc 0123456789
        </p>
      </div>
    </div>
  );
}

function UiKitNavigation({
  activeItem,
  onSelect,
}: {
  activeItem: string | null;
  onSelect: (itemId: string) => void;
}) {
  const [query, setQuery] = React.useState("");
  const filtered = navigation
    .map((group) => ({
      ...group,
      items: group.items.filter((item) =>
        `${group.label} ${item.label}`
          .toLowerCase()
          .includes(query.toLowerCase()),
      ),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <aside className="hidden h-full w-[224px] shrink-0 flex-col rounded-2xl border bg-card/80 p-3 lg:flex">
      <div className="relative">
        <Icon
          icon={Search01Icon}
          size={16}
          className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="Search"
          placeholder="Search"
          className="h-9 pl-9 text-xs"
        />
      </div>
      <nav className="mt-4 min-h-0 flex-1 space-y-5 overflow-y-auto">
        {filtered.map((group) => (
          <div key={group.label}>
            <p className="px-2 text-[10px] font-semibold tracking-widest text-muted-foreground uppercase">
              {group.label}
            </p>
            <ul className="mt-1.5 space-y-0.5">
              {group.items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    aria-current={activeItem === item.id ? "page" : undefined}
                    onClick={() => onSelect(item.id)}
                    className={`block w-full rounded-lg px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                      activeItem === item.id
                        ? "bg-muted font-medium text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function UiKitCatalog() {
  const [selectedItem, setSelectedItem] = React.useState<string | null>(
    "buttons",
  );
  const [units, setUnits] = React.useState(2);
  const [radioValue, setRadioValue] = React.useState("solo");
  const [calendarDate, setCalendarDate] = React.useState<Date | undefined>(
    () => new Date(),
  );
  const [time, setTime] = React.useState("09:30");
  const [commandOpen, setCommandOpen] = React.useState(false);
  const [showEmail, setShowEmail] = React.useState(true);

  return (
    <div className="theme-preview flex h-svh flex-col overflow-hidden bg-background text-foreground">
      <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b bg-background/95 px-4 backdrop-blur sm:px-6">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          Temas{" "}
          <span className="font-normal text-muted-foreground">/ UI kit</span>
        </Link>
        <div className="flex items-center gap-2">
          <ThemeModeSwitch />
        </div>
      </header>

      <div className="mx-auto flex min-h-0 w-full max-w-[1680px] flex-1 flex-col items-stretch gap-4 overflow-hidden px-3 py-4 sm:gap-5 sm:px-5 lg:flex-row lg:items-stretch">
        <UiKitNavigation activeItem={selectedItem} onSelect={setSelectedItem} />

        <main className="min-h-0 min-w-0 flex-1 overflow-hidden">
          <div className="mx-auto flex h-full min-h-0 max-w-6xl flex-col overflow-hidden">
            <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-border/50 pt-2 pb-4">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                  Temas · Product UI
                </p>
                <h1 className="mt-0.5 text-xl font-semibold tracking-tight">
                  Design system
                </h1>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Hover for states · Tab for keyboard focus
                </p>
              </div>
              <p className="max-w-xl text-sm leading-5 text-muted-foreground">
                The colors, type, and shared interface pieces used throughout
                the workspace. These are the real app components, so changes
                appear everywhere they are used.
              </p>
            </div>
            <div className="mt-3 flex gap-2 text-xs lg:hidden">
              <button
                type="button"
                aria-current={
                  selectedItem === "typography" ? "page" : undefined
                }
                onClick={() => setSelectedItem("typography")}
                className="rounded-md border bg-card px-2 py-1.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Typography
              </button>
              <button
                type="button"
                aria-current={selectedItem === "colors" ? "page" : undefined}
                onClick={() => setSelectedItem("colors")}
                className="rounded-md border bg-card px-2 py-1.5 hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Colors
              </button>
            </div>

            <div
              className="mt-4 flex min-h-0 flex-1 flex-col overflow-y-auto"
              data-catalog-content
              data-selected-item={selectedItem ?? undefined}
            >
              {selectedItem ? (
                <style>{`
                  [data-catalog-content] > [data-catalog-section]:not([data-catalog-item="${selectedItem}"]):not(:has([data-catalog-item="${selectedItem}"])) { display: none; }
                  [data-catalog-content] [data-catalog-item]:not([data-catalog-item="${selectedItem}"]) { display: none; }
                  [data-catalog-content] [data-catalog-group-heading] { display: none; }
                  [data-catalog-content] [data-catalog-item="${selectedItem}"] { grid-column: 1 / -1; }
                  [data-catalog-content] > [data-catalog-section]:has([data-catalog-item="${selectedItem}"]) { display: flex; flex: 1; flex-direction: column; min-height: 0; }
                  [data-catalog-content] [data-catalog-grid]:has(> [data-catalog-item="${selectedItem}"]) { display: flex; flex: 1; flex-direction: column; min-height: 0; }
                  [data-catalog-content] [data-catalog-item="${selectedItem}"] { display: flex; flex: 1; flex-direction: column; min-height: 0; }
                `}</style>
              ) : null}
              <section
                className="space-y-4"
                data-catalog-section
                data-catalog-item="typography"
              >
                <SectionHeading
                  id="typography"
                  eyebrow="Foundations · 01"
                  title="Typography"
                  description="Only font families referenced by the app are shown."
                />
                <TypographySpecimens />
              </section>

              <section
                className="space-y-4"
                data-catalog-section
                data-catalog-item="colors"
              >
                <SectionHeading
                  id="colors"
                  eyebrow="Foundations · 02"
                  title="Colors"
                  description="Switch the app-wide theme in the header to preview these tokens."
                />
                <ColorPalette />
              </section>

              <section
                className="space-y-4"
                data-catalog-section
                data-catalog-item="icons"
              >
                <SectionHeading
                  id="icons"
                  eyebrow="Foundations · 03"
                  title="Icons"
                  description="A sample of the shared Hugeicons registry used by the app."
                />
                <Specimen title="Icon registry">
                  <VariantPreview
                    options={iconSamples.map(([icon, label]) => ({
                      value: label.toLowerCase(),
                      label,
                      preview: (
                        <div className="flex items-center gap-2 rounded-lg border px-3 py-3 text-sm">
                          <Icon
                            icon={icon}
                            size={18}
                            className="text-muted-foreground"
                          />
                          {label}
                        </div>
                      ),
                    }))}
                  />
                </Specimen>
              </section>

              <section className="space-y-4" data-catalog-section>
                <SectionHeading
                  id="actions"
                  eyebrow="Components · 01"
                  title="Actions & status"
                  description="Buttons, badges, and avatars."
                  catalogGroup
                />
                <div data-catalog-grid className="grid gap-3 xl:grid-cols-2">
                  <Specimen
                    id="buttons"
                    title="Buttons"
                    description="Choose one style, size, or state to preview."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "default",
                          label: "Default · primary",
                          preview: <Button>Get started</Button>,
                        },
                        {
                          value: "outline",
                          label: "Outline",
                          preview: <Button variant="outline">Continue</Button>,
                        },
                        {
                          value: "secondary",
                          label: "Secondary",
                          preview: (
                            <Button variant="secondary">Continue</Button>
                          ),
                        },
                        {
                          value: "soft",
                          label: "Soft",
                          preview: <Button variant="soft">Continue</Button>,
                        },
                        {
                          value: "pill",
                          label: "Pill",
                          preview: <Button variant="pill">Continue</Button>,
                        },
                        {
                          value: "ghost",
                          label: "Ghost",
                          preview: <Button variant="ghost">Continue</Button>,
                        },
                        {
                          value: "destructive",
                          label: "Destructive",
                          preview: (
                            <Button variant="destructive">
                              Delete listing
                            </Button>
                          ),
                        },
                        {
                          value: "link",
                          label: "Link",
                          preview: <Button variant="link">View details</Button>,
                        },
                        {
                          value: "small",
                          label: "Small size",
                          preview: <Button size="sm">Continue</Button>,
                        },
                        {
                          value: "extra-small",
                          label: "Extra small",
                          preview: <Button size="xs">Continue</Button>,
                        },
                        {
                          value: "large",
                          label: "Large size",
                          preview: <Button size="lg">Continue</Button>,
                        },
                        {
                          value: "icon",
                          label: "Icon button",
                          preview: (
                            <Button size="icon" aria-label="Add">
                              <Icon icon={Add01Icon} size={16} />
                            </Button>
                          ),
                        },
                        {
                          value: "icon-xs",
                          label: "Icon · extra small",
                          preview: (
                            <Button size="icon-xs" aria-label="Add">
                              <Icon icon={Add01Icon} size={16} />
                            </Button>
                          ),
                        },
                        {
                          value: "icon-sm",
                          label: "Icon · small",
                          preview: (
                            <Button size="icon-sm" aria-label="Add">
                              <Icon icon={Add01Icon} size={16} />
                            </Button>
                          ),
                        },
                        {
                          value: "icon-lg",
                          label: "Icon · large",
                          preview: (
                            <Button size="icon-lg" aria-label="Add">
                              <Icon icon={Add01Icon} size={16} />
                            </Button>
                          ),
                        },
                        {
                          value: "disabled",
                          label: "Disabled",
                          preview: <Button disabled>Unavailable</Button>,
                        },
                      ]}
                    />
                  </Specimen>

                  <Specimen
                    id="badges"
                    title="Badges"
                    description="Choose one badge style to preview."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "default",
                          label: "Default · primary",
                          preview: <Badge>Available</Badge>,
                        },
                        {
                          value: "secondary",
                          label: "Secondary",
                          preview: <Badge variant="secondary">Draft</Badge>,
                        },
                        {
                          value: "outline",
                          label: "Outline",
                          preview: <Badge variant="outline">Pending</Badge>,
                        },
                        {
                          value: "ghost",
                          label: "Ghost",
                          preview: <Badge variant="ghost">Quiet status</Badge>,
                        },
                        {
                          value: "link",
                          label: "Link",
                          preview: <Badge variant="link">View details</Badge>,
                        },
                        {
                          value: "destructive",
                          label: "Destructive",
                          preview: (
                            <Badge variant="destructive">Unavailable</Badge>
                          ),
                        },
                        {
                          value: "brand",
                          label: "Brand",
                          preview: <Badge variant="brand">New</Badge>,
                        },
                        {
                          value: "success",
                          label: "Success",
                          preview: <Badge variant="success">Confirmed</Badge>,
                        },
                        {
                          value: "warning",
                          label: "Warning",
                          preview: <Badge variant="warning">Review</Badge>,
                        },
                        {
                          value: "info",
                          label: "Info",
                          preview: <Badge variant="info">Information</Badge>,
                        },
                      ]}
                    />
                  </Specimen>

                  <Specimen
                    id="avatars"
                    title="Avatars"
                    description="Choose one avatar treatment to preview."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "fallback",
                          label: "Default · fallback",
                          preview: (
                            <Avatar>
                              <AvatarFallback>AM</AvatarFallback>
                            </Avatar>
                          ),
                        },
                        {
                          value: "presence",
                          label: "Presence",
                          preview: (
                            <Avatar>
                              <AvatarFallback>JT</AvatarFallback>
                              <AvatarBadge />
                            </Avatar>
                          ),
                        },
                        {
                          value: "presence-small",
                          label: "Presence · small",
                          preview: (
                            <Avatar size="sm">
                              <AvatarFallback>JT</AvatarFallback>
                              <AvatarBadge />
                            </Avatar>
                          ),
                        },
                        {
                          value: "presence-large",
                          label: "Presence · large",
                          preview: (
                            <Avatar size="lg">
                              <AvatarFallback>JT</AvatarFallback>
                              <AvatarBadge />
                            </Avatar>
                          ),
                        },
                        {
                          value: "image",
                          label: "Image",
                          preview: (
                            <Avatar>
                              <AvatarImage
                                src="/marketing/agent-portrait.webp"
                                alt="Agent"
                              />
                              <AvatarFallback>EM</AvatarFallback>
                            </Avatar>
                          ),
                        },
                        {
                          value: "large",
                          label: "Large",
                          preview: (
                            <Avatar size="lg">
                              <AvatarFallback>SK</AvatarFallback>
                            </Avatar>
                          ),
                        },
                        {
                          value: "small",
                          label: "Small",
                          preview: (
                            <Avatar size="sm">
                              <AvatarFallback>EM</AvatarFallback>
                            </Avatar>
                          ),
                        },
                        {
                          value: "group",
                          label: "Group",
                          preview: (
                            <AvatarGroup>
                              <Avatar>
                                <AvatarFallback>AM</AvatarFallback>
                              </Avatar>
                              <Avatar>
                                <AvatarFallback>JT</AvatarFallback>
                              </Avatar>
                              <Avatar>
                                <AvatarFallback>SK</AvatarFallback>
                              </Avatar>
                              <AvatarGroupCount>+4</AvatarGroupCount>
                            </AvatarGroup>
                          ),
                        },
                        {
                          value: "person-mark",
                          label: "Person mark · app component",
                          preview: <PersonAvatar initials="AM" />,
                        },
                        {
                          value: "person-photo",
                          label: "Person mark · image",
                          preview: (
                            <PersonAvatar
                              initials="AM"
                              src="/marketing/agent-portrait.webp"
                            />
                          ),
                        },
                        {
                          value: "workspace-mark",
                          label: "Workspace mark · app component",
                          preview: <WorkspaceMark initials="NR" />,
                        },
                      ]}
                    />
                  </Specimen>
                </div>
              </section>

              <section className="space-y-4" data-catalog-section>
                <SectionHeading
                  id="forms"
                  eyebrow="Components · 02"
                  title="Forms & inputs"
                  description="Fields, text inputs, input groups, file input, and quantity controls."
                  catalogGroup
                />
                <div data-catalog-grid className="grid gap-3 xl:grid-cols-2">
                  <Specimen
                    id="input"
                    title="Input & textarea"
                    description="Choose a variant to preview one input at a time."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "default",
                          label: "Default · primary",
                          preview: (
                            <div className="grid gap-1.5">
                              <Label htmlFor="kit-input-default">
                                Workspace name
                              </Label>
                              <Input
                                id="kit-input-default"
                                defaultValue="North Shore Realty"
                              />
                            </div>
                          ),
                        },
                        {
                          value: "small",
                          label: "Small",
                          preview: (
                            <div className="grid gap-1.5">
                              <Label htmlFor="kit-input-small">
                                Workspace name
                              </Label>
                              <Input
                                id="kit-input-small"
                                size="sm"
                                defaultValue="North Shore Realty"
                              />
                            </div>
                          ),
                        },
                        {
                          value: "invalid",
                          label: "Invalid",
                          preview: (
                            <div className="grid gap-1.5">
                              <Label htmlFor="kit-input-invalid">
                                Email address
                              </Label>
                              <Input
                                id="kit-input-invalid"
                                aria-invalid="true"
                                defaultValue="not-an-email"
                              />
                            </div>
                          ),
                        },
                        {
                          value: "disabled",
                          label: "Disabled",
                          preview: (
                            <div className="grid gap-1.5">
                              <Label htmlFor="kit-input-disabled">
                                Workspace name
                              </Label>
                              <Input
                                id="kit-input-disabled"
                                disabled
                                placeholder="Disabled input"
                              />
                            </div>
                          ),
                        },
                        {
                          value: "textarea",
                          label: "Textarea",
                          preview: (
                            <div className="grid gap-1.5">
                              <Label htmlFor="kit-textarea-preview">
                                Notes
                              </Label>
                              <Textarea
                                id="kit-textarea-preview"
                                placeholder="Add a note for your team…"
                              />
                            </div>
                          ),
                        },
                        {
                          value: "textarea-invalid",
                          label: "Textarea · invalid",
                          preview: (
                            <div className="grid w-full gap-1.5">
                              <Label htmlFor="kit-textarea-invalid">
                                Notes
                              </Label>
                              <Textarea
                                id="kit-textarea-invalid"
                                aria-invalid="true"
                                defaultValue="Please add more detail."
                              />
                            </div>
                          ),
                        },
                        {
                          value: "textarea-disabled",
                          label: "Textarea · disabled",
                          preview: (
                            <div className="grid w-full gap-1.5">
                              <Label htmlFor="kit-textarea-disabled">
                                Notes
                              </Label>
                              <Textarea
                                id="kit-textarea-disabled"
                                disabled
                                placeholder="Notes are unavailable"
                              />
                            </div>
                          ),
                        },
                      ]}
                    />
                  </Specimen>

                  <Specimen
                    id="field"
                    title="Field composition"
                    description="Choose one field state to preview."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "email",
                          label: "Default · email",
                          preview: (
                            <FieldSet>
                              <FieldLegend>Contact details</FieldLegend>
                              <FieldGroup>
                                <Field>
                                  <FieldLabel htmlFor="kit-email">
                                    Email address
                                  </FieldLabel>
                                  <Input
                                    id="kit-email"
                                    type="email"
                                    placeholder="name@example.com"
                                  />
                                  <FieldDescription>
                                    Used for property updates and viewing
                                    invitations.
                                  </FieldDescription>
                                </Field>
                              </FieldGroup>
                            </FieldSet>
                          ),
                        },
                        {
                          value: "invalid",
                          label: "Invalid · phone",
                          preview: (
                            <FieldSet>
                              <FieldLegend>Contact details</FieldLegend>
                              <FieldGroup>
                                <Field data-invalid="true">
                                  <FieldLabel htmlFor="kit-phone">
                                    Phone number
                                  </FieldLabel>
                                  <Input
                                    id="kit-phone"
                                    aria-invalid="true"
                                    defaultValue="123"
                                  />
                                  <FieldError>
                                    Enter a valid phone number.
                                  </FieldError>
                                </Field>
                              </FieldGroup>
                            </FieldSet>
                          ),
                        },
                        {
                          value: "separated",
                          label: "Field title · separator",
                          preview: (
                            <FieldSet className="w-full max-w-sm">
                              <FieldTitle>Contact options</FieldTitle>
                              <FieldGroup>
                                <Field>
                                  <FieldLabel htmlFor="kit-field-phone">
                                    Phone number
                                  </FieldLabel>
                                  <Input
                                    id="kit-field-phone"
                                    type="tel"
                                    placeholder="+372 555 0100"
                                  />
                                </Field>
                                <FieldSeparator>or</FieldSeparator>
                                <Field orientation="responsive">
                                  <FieldLabel htmlFor="kit-field-email">
                                    Email address
                                  </FieldLabel>
                                  <Input
                                    id="kit-field-email"
                                    type="email"
                                    placeholder="name@example.com"
                                  />
                                </Field>
                              </FieldGroup>
                            </FieldSet>
                          ),
                        },
                      ]}
                    />
                  </Specimen>

                  <Specimen
                    id="input-group"
                    title="Input group"
                    description="Choose one input group composition to preview."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "search",
                          label: "Search · action",
                          preview: (
                            <InputGroup>
                              <InputGroupAddon>
                                <InputGroupText>
                                  <Icon icon={Search01Icon} size={16} />
                                  Search
                                </InputGroupText>
                              </InputGroupAddon>
                              <InputGroupInput
                                aria-label="Search listings"
                                placeholder="Search listings"
                              />
                              <InputGroupAddon align="inline-end">
                                <InputGroupButton
                                  aria-label="Filter"
                                  size="icon-xs"
                                >
                                  <Icon icon={FilterIcon} size={16} />
                                </InputGroupButton>
                              </InputGroupAddon>
                            </InputGroup>
                          ),
                        },
                        {
                          value: "email",
                          label: "Email · suffix",
                          preview: (
                            <InputGroup>
                              <InputGroupInput
                                aria-label="Email recipient"
                                defaultValue="agent@temas.app"
                              />
                              <InputGroupAddon align="inline-end">
                                <InputGroupText>@temas.app</InputGroupText>
                              </InputGroupAddon>
                            </InputGroup>
                          ),
                        },
                        {
                          value: "note",
                          label: "Textarea · block addons",
                          preview: (
                            <InputGroup className="h-auto w-full max-w-md flex-col items-stretch">
                              <InputGroupAddon
                                align="block-start"
                                className="border-b"
                              >
                                <InputGroupText>Agent note</InputGroupText>
                              </InputGroupAddon>
                              <InputGroupTextarea
                                aria-label="Agent note"
                                placeholder="Add a note for your team…"
                              />
                              <InputGroupAddon
                                align="block-end"
                                className="justify-between border-t"
                              >
                                <InputGroupText>
                                  Visible to your team
                                </InputGroupText>
                                <InputGroupText>0/500</InputGroupText>
                              </InputGroupAddon>
                            </InputGroup>
                          ),
                        },
                      ]}
                    />
                  </Specimen>

                  <Specimen
                    id="file-input"
                    title="File input"
                    description="Uses the shared file picker control."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "default",
                          label: "Default · enabled",
                          preview: (
                            <div className="w-full max-w-sm">
                              <FileInput
                                buttonLabel="Choose file"
                                emptyLabel="No file selected"
                                aria-label="Choose a file"
                              />
                            </div>
                          ),
                        },
                        {
                          value: "disabled",
                          label: "Disabled",
                          preview: (
                            <div className="w-full max-w-sm">
                              <FileInput
                                buttonLabel="Choose file"
                                emptyLabel="File upload unavailable"
                                aria-label="Choose a file"
                                disabled
                              />
                            </div>
                          ),
                        },
                      ]}
                    />
                  </Specimen>

                  <Specimen
                    id="number-field"
                    title="Number field"
                    description="Increment and decrement controls."
                  >
                    <div className="flex items-center gap-4">
                      <NumberField
                        value={units}
                        min={0}
                        max={10}
                        decreaseLabel="Decrease seats"
                        increaseLabel="Increase seats"
                        onChange={setUnits}
                      />
                      <span className="text-sm text-muted-foreground">
                        {units} seats
                      </span>
                    </div>
                  </Specimen>

                  <Specimen
                    id="select"
                    title="Select"
                    description="The shared accessible select, with size and validation states."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "default",
                          label: "Default · selected",
                          preview: <PropertyTypeSelectPreview />,
                        },
                        {
                          value: "small",
                          label: "Small",
                          preview: <PropertyTypeSelectPreview size="sm" />,
                        },
                        {
                          value: "invalid",
                          label: "Invalid",
                          preview: <PropertyTypeSelectPreview invalid />,
                        },
                        {
                          value: "disabled",
                          label: "Disabled",
                          preview: <PropertyTypeSelectPreview disabled />,
                        },
                      ]}
                    />
                  </Specimen>
                </div>
              </section>

              <section className="space-y-4" data-catalog-section>
                <SectionHeading
                  id="selection"
                  eyebrow="Components · 03"
                  title="Selection & scheduling"
                  description="Checkboxes, radio groups, switches, tabs, calendar, and time controls."
                  catalogGroup
                />
                <div data-catalog-grid className="grid gap-3 xl:grid-cols-2">
                  <Specimen
                    id="checkbox"
                    title="Checkbox"
                    description="Choose one checkbox state to preview."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "checked",
                          label: "Default · checked",
                          preview: (
                            <Field orientation="horizontal" className="w-fit">
                              <Checkbox
                                id="kit-checkbox-checked"
                                defaultChecked
                              />
                              <FieldLabel htmlFor="kit-checkbox-checked">
                                Email me a summary
                              </FieldLabel>
                            </Field>
                          ),
                        },
                        {
                          value: "unchecked",
                          label: "Unchecked",
                          preview: (
                            <Field orientation="horizontal" className="w-fit">
                              <Checkbox id="kit-checkbox-unchecked" />
                              <FieldLabel htmlFor="kit-checkbox-unchecked">
                                Add calendar reminders
                              </FieldLabel>
                            </Field>
                          ),
                        },
                        {
                          value: "indeterminate",
                          label: "Indeterminate",
                          preview: (
                            <Field orientation="horizontal" className="w-fit">
                              <Checkbox
                                id="kit-checkbox-indeterminate"
                                checked="indeterminate"
                              />
                              <FieldLabel htmlFor="kit-checkbox-indeterminate">
                                Select all properties
                              </FieldLabel>
                            </Field>
                          ),
                        },
                        {
                          value: "disabled",
                          label: "Disabled",
                          preview: (
                            <Field
                              orientation="horizontal"
                              className="w-fit"
                              data-disabled="true"
                            >
                              <Checkbox id="kit-checkbox-disabled" disabled />
                              <FieldLabel htmlFor="kit-checkbox-disabled">
                                Unavailable option
                              </FieldLabel>
                            </Field>
                          ),
                        },
                      ]}
                    />
                  </Specimen>

                  <Specimen
                    id="radio-group"
                    title="Radio group"
                    description="Single selection with native focus states."
                  >
                    <RadioGroup
                      value={radioValue}
                      onValueChange={setRadioValue}
                      aria-label="Workspace plan"
                    >
                      <Field orientation="horizontal">
                        <RadioGroupItem value="solo" id="kit-radio-solo" />
                        <FieldContent>
                          <FieldLabel htmlFor="kit-radio-solo">Solo</FieldLabel>
                          <FieldDescription>
                            One agent workspace
                          </FieldDescription>
                        </FieldContent>
                      </Field>
                      <Field orientation="horizontal">
                        <RadioGroupItem value="team" id="kit-radio-team" />
                        <FieldContent>
                          <FieldLabel htmlFor="kit-radio-team">Team</FieldLabel>
                          <FieldDescription>
                            Shared office workspace
                          </FieldDescription>
                        </FieldContent>
                      </Field>
                    </RadioGroup>
                  </Specimen>

                  <Specimen
                    id="switch"
                    title="Switch"
                    description="Choose one switch state to preview."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "on",
                          label: "Default · on",
                          preview: (
                            <Field
                              orientation="horizontal"
                              className="max-w-sm"
                            >
                              <FieldLabel htmlFor="kit-switch-on">
                                Email notifications
                              </FieldLabel>
                              <Switch id="kit-switch-on" defaultChecked />
                            </Field>
                          ),
                        },
                        {
                          value: "off",
                          label: "Off",
                          preview: (
                            <Field
                              orientation="horizontal"
                              className="max-w-sm"
                            >
                              <FieldLabel htmlFor="kit-switch-off">
                                WhatsApp reminders
                              </FieldLabel>
                              <Switch id="kit-switch-off" />
                            </Field>
                          ),
                        },
                        {
                          value: "disabled",
                          label: "Disabled",
                          preview: (
                            <Field
                              orientation="horizontal"
                              className="max-w-sm"
                              data-disabled="true"
                            >
                              <FieldLabel htmlFor="kit-switch-disabled">
                                Unavailable
                              </FieldLabel>
                              <Switch id="kit-switch-disabled" disabled />
                            </Field>
                          ),
                        },
                        {
                          value: "small",
                          label: "Small size",
                          preview: (
                            <Field
                              orientation="horizontal"
                              className="max-w-sm"
                            >
                              <FieldLabel htmlFor="kit-switch-small">
                                Compact setting
                              </FieldLabel>
                              <Switch
                                id="kit-switch-small"
                                size="sm"
                                defaultChecked
                              />
                            </Field>
                          ),
                        },
                        {
                          value: "large",
                          label: "Large size",
                          preview: (
                            <Field
                              orientation="horizontal"
                              className="max-w-sm"
                            >
                              <FieldLabel htmlFor="kit-switch-large">
                                Extended setting
                              </FieldLabel>
                              <Switch
                                id="kit-switch-large"
                                size="lg"
                                defaultChecked
                              />
                            </Field>
                          ),
                        },
                      ]}
                    />
                  </Specimen>

                  <Specimen
                    id="tabs"
                    title="Tabs"
                    description="Choose one tab style to preview."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "line",
                          label: "Default · line",
                          preview: (
                            <Tabs defaultValue="overview">
                              <TabsList>
                                <TabsTrigger value="overview">
                                  Overview
                                </TabsTrigger>
                                <TabsTrigger value="activity">
                                  Activity
                                </TabsTrigger>
                                <TabsTrigger value="documents">
                                  Documents
                                </TabsTrigger>
                              </TabsList>
                              <TabsContent
                                value="overview"
                                className="pt-3 text-sm text-muted-foreground"
                              >
                                Property details and the next step.
                              </TabsContent>
                              <TabsContent
                                value="activity"
                                className="pt-3 text-sm text-muted-foreground"
                              >
                                Recent messages, viewings, and notes.
                              </TabsContent>
                              <TabsContent
                                value="documents"
                                className="pt-3 text-sm text-muted-foreground"
                              >
                                Shared property documents.
                              </TabsContent>
                            </Tabs>
                          ),
                        },
                        {
                          value: "pill",
                          label: "Pill",
                          preview: (
                            <Tabs defaultValue="month">
                              <TabsList variant="pill">
                                <TabsTrigger value="month">Month</TabsTrigger>
                                <TabsTrigger value="year">Year</TabsTrigger>
                              </TabsList>
                            </Tabs>
                          ),
                        },
                      ]}
                    />
                  </Specimen>

                  <Specimen
                    id="calendar"
                    title="Calendar"
                    description="Date selection and keyboard-accessible day navigation."
                  >
                    <Calendar
                      mode="single"
                      selected={calendarDate}
                      onSelect={setCalendarDate}
                      defaultMonth={calendarDate}
                    />
                  </Specimen>

                  <Specimen
                    id="date-time"
                    title="Date & time pickers"
                    description="Shared popover-backed schedule inputs."
                  >
                    <div className="grid gap-3 sm:grid-cols-2">
                      <DatePicker
                        defaultValue="2026-09-30"
                        placeholder="Choose date"
                      />
                      <TimePicker
                        value={time}
                        onValueChange={setTime}
                        ariaLabel="Viewing time"
                      />
                    </div>
                  </Specimen>

                  <Specimen
                    id="search-select"
                    title="Search select"
                    description="The shared searchable choice control used for location fields."
                  >
                    <div className="w-full max-w-sm">
                      <SearchSelectPreview />
                    </div>
                  </Specimen>

                  <Specimen
                    id="currency-select"
                    title="Currency select"
                    description="Searchable ISO currency options with the workspace default."
                  >
                    <div className="w-full max-w-sm">
                      <CurrencySelect defaultValue="EUR" />
                    </div>
                  </Specimen>

                  <Specimen
                    id="timezone-select"
                    title="Timezone select"
                    description="Searchable IANA timezone options."
                  >
                    <div className="w-full max-w-sm">
                      <TimezoneSelect defaultValue="Europe/Tallinn" />
                    </div>
                  </Specimen>

                  <Specimen
                    id="ai-language-select"
                    title="AI language select"
                    description="Searchable language options with automatic language detection."
                  >
                    <div className="w-full max-w-sm">
                      <AiLanguageSelect defaultValue="auto" />
                    </div>
                  </Specimen>
                </div>
              </section>

              <section className="space-y-4" data-catalog-section>
                <SectionHeading
                  id="navigation"
                  eyebrow="Components · 04"
                  title="Navigation"
                  description="Paths, menus, tooltips, and contextual actions."
                  catalogGroup
                />
                <div data-catalog-grid className="grid gap-3 xl:grid-cols-2">
                  <Specimen
                    id="breadcrumb"
                    title="Breadcrumb"
                    description="Current location and parent pages."
                  >
                    <Breadcrumb>
                      <BreadcrumbList>
                        <BreadcrumbItem>
                          <BreadcrumbLink href="#navigation">
                            Workspace
                          </BreadcrumbLink>
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbEllipsis />
                        </BreadcrumbItem>
                        <BreadcrumbSeparator />
                        <BreadcrumbItem>
                          <BreadcrumbPage>Properties</BreadcrumbPage>
                        </BreadcrumbItem>
                      </BreadcrumbList>
                    </Breadcrumb>
                  </Specimen>

                  <Specimen
                    id="dropdown-menu"
                    title="Dropdown menu"
                    description="Open with the trigger; use arrows and Enter to navigate."
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline">
                          Open menu <Icon icon={ArrowRight01Icon} size={16} />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="start">
                        <DropdownMenuLabel>Workspace</DropdownMenuLabel>
                        <DropdownMenuItem>
                          <Icon icon={Settings02Icon} size={16} />
                          Settings
                          <DropdownMenuShortcut>⌘,</DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Icon icon={UserAdd01Icon} size={16} />
                          Invite agent
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem variant="destructive">
                          Archive workspace
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuCheckboxItem
                          checked={showEmail}
                          onCheckedChange={setShowEmail}
                        >
                          Email notifications
                        </DropdownMenuCheckboxItem>
                        <DropdownMenuRadioGroup
                          value={radioValue}
                          onValueChange={setRadioValue}
                        >
                          <DropdownMenuRadioItem value="solo">
                            Solo workspace
                          </DropdownMenuRadioItem>
                          <DropdownMenuRadioItem value="team">
                            Team workspace
                          </DropdownMenuRadioItem>
                        </DropdownMenuRadioGroup>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </Specimen>

                  <Specimen
                    id="context-menu"
                    title="Context menu"
                    description="Right-click the target to reveal actions."
                  >
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <Button
                          variant="outline"
                          className="h-20 w-full border-dashed text-muted-foreground"
                        >
                          Right-click this area
                        </Button>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuItem>Open property</ContextMenuItem>
                        <ContextMenuItem>Copy link</ContextMenuItem>
                        <ContextMenuItem>Archive</ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  </Specimen>

                  <Specimen
                    id="tooltip"
                    title="Tooltip"
                    description="Hover or focus the button to reveal its label."
                  >
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="icon"
                          aria-label="Add property"
                        >
                          <Icon icon={Add01Icon} size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Add property</TooltipContent>
                    </Tooltip>
                  </Specimen>
                </div>
              </section>

              <section className="space-y-4" data-catalog-section>
                <SectionHeading
                  id="surfaces"
                  eyebrow="Components · 05"
                  title="Surfaces & data"
                  description="Cards, tables, scroll areas, command palette, and loading placeholders."
                  catalogGroup
                />
                <div data-catalog-grid className="grid gap-3 xl:grid-cols-2">
                  <Specimen
                    id="card"
                    title="Card"
                    description="Header, content, action, and footer slots."
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>Viewing requests</CardTitle>
                        <CardDescription>
                          3 applicants are ready to schedule.
                        </CardDescription>
                        <CardAction>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            aria-label="More options"
                          >
                            <Icon icon={MoreHorizontalIcon} size={16} />
                          </Button>
                        </CardAction>
                      </CardHeader>
                      <CardContent>
                        <p className="text-sm text-muted-foreground">
                          Choose a time window to find a slot everyone can make.
                        </p>
                      </CardContent>
                      <CardFooter>
                        <Button size="sm">Find a time</Button>
                      </CardFooter>
                    </Card>
                  </Specimen>

                  <Specimen
                    id="table"
                    title="Table"
                    description="Rows, headers, captions, and status badges."
                  >
                    <Table>
                      <TableCaption>
                        Recent properties in your workspace.
                      </TableCaption>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Property</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Rent</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow>
                          <TableCell className="font-medium">
                            Harbor House
                          </TableCell>
                          <TableCell>
                            <PropertyStatusBadge status="active" />
                          </TableCell>
                          <TableCell className="text-right">€1,450</TableCell>
                        </TableRow>
                        <TableRow>
                          <TableCell className="font-medium">
                            Oak Street 12
                          </TableCell>
                          <TableCell>
                            <PropertyStatusBadge status="draft" />
                          </TableCell>
                          <TableCell className="text-right">€980</TableCell>
                        </TableRow>
                      </TableBody>
                      <TableFooter>
                        <TableRow>
                          <TableCell colSpan={2}>Total monthly rent</TableCell>
                          <TableCell className="text-right">€2,430</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </Specimen>

                  <Specimen
                    id="skeleton"
                    title="Skeleton"
                    description="Choose one placeholder shape to preview."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "text",
                          label: "Default · text",
                          preview: <Skeleton className="h-4 w-48" />,
                        },
                        {
                          value: "avatar",
                          label: "Avatar",
                          preview: (
                            <Skeleton className="size-10 rounded-full" />
                          ),
                        },
                        {
                          value: "card",
                          label: "Card",
                          preview: (
                            <Skeleton className="h-20 w-full rounded-lg" />
                          ),
                        },
                      ]}
                    />
                  </Specimen>

                  <Specimen
                    id="scroll-area"
                    title="Scroll area"
                    description="A contained scroll region for long lists."
                  >
                    <ScrollArea className="h-36 rounded-lg border p-3">
                      <div className="space-y-3 pr-3">
                        {Array.from({ length: 8 }, (_, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between border-b pb-2 last:border-0"
                          >
                            <span className="text-sm">
                              Applicant {index + 1}
                            </span>
                            <span className="text-xs text-muted-foreground">
                              Added today
                            </span>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  </Specimen>

                  <Specimen
                    id="command"
                    title="Command palette"
                    description="Search actions and use keyboard navigation."
                  >
                    <Button
                      variant="outline"
                      onClick={() => setCommandOpen(true)}
                    >
                      <Icon icon={Search01Icon} size={16} />
                      Open command palette
                      <kbd className="ml-2 rounded border px-1.5 py-0.5 text-[10px] text-muted-foreground">
                        ⌘ K
                      </kbd>
                    </Button>
                    <CommandDialog
                      open={commandOpen}
                      onOpenChange={setCommandOpen}
                    >
                      <CommandInput placeholder="Search actions…" />
                      <CommandList>
                        <CommandEmpty>No results found.</CommandEmpty>
                        <CommandGroup heading="Create">
                          <CommandItem onSelect={() => setCommandOpen(false)}>
                            <Icon icon={Add01Icon} size={16} />
                            New property<CommandShortcut>⌘ N</CommandShortcut>
                          </CommandItem>
                          <CommandItem onSelect={() => setCommandOpen(false)}>
                            <Icon icon={UserAdd01Icon} size={16} />
                            Invite an agent
                          </CommandItem>
                        </CommandGroup>
                        <CommandGroup heading="Go to">
                          <CommandItem onSelect={() => setCommandOpen(false)}>
                            Inbox<CommandShortcut>G I</CommandShortcut>
                          </CommandItem>
                          <CommandItem onSelect={() => setCommandOpen(false)}>
                            Calendar<CommandShortcut>G C</CommandShortcut>
                          </CommandItem>
                        </CommandGroup>
                        <CommandSeparator />
                        <CommandGroup heading="Account">
                          <CommandItem onSelect={() => setCommandOpen(false)}>
                            Workspace settings
                          </CommandItem>
                        </CommandGroup>
                      </CommandList>
                    </CommandDialog>
                  </Specimen>
                </div>
              </section>

              <section className="space-y-4" data-catalog-section>
                <SectionHeading
                  id="overlays"
                  eyebrow="Components · 06"
                  title="Overlays"
                  description="Dialog, alert dialog, sheet, popover, and anchored actions."
                  catalogGroup
                />
                <div
                  data-catalog-grid
                  className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                >
                  <Specimen id="dialog" title="Dialog">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline">Open dialog</Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Invite an agent</DialogTitle>
                          <DialogDescription>
                            Send an invitation to join this workspace.
                          </DialogDescription>
                        </DialogHeader>
                        <Input
                          aria-label="Invite email"
                          placeholder="agent@example.com"
                        />
                        <DialogFooter>
                          <Button variant="outline">Cancel</Button>
                          <Button>Send invite</Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </Specimen>

                  <Specimen id="alert-dialog" title="Alert dialog">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline">Archive listing</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>
                            Archive this listing?
                          </AlertDialogTitle>
                          <AlertDialogDescription>
                            You can restore it from archived properties later.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction>Archive</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </Specimen>

                  <Specimen id="sheet" title="Sheet">
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button variant="outline">Open sheet</Button>
                      </SheetTrigger>
                      <SheetContent>
                        <SheetHeader>
                          <SheetTitle>Property details</SheetTitle>
                          <SheetDescription>
                            Quick details in a side panel.
                          </SheetDescription>
                        </SheetHeader>
                        <div className="px-4 text-sm">
                          <p className="font-medium">Harbor House</p>
                          <p className="mt-1 text-muted-foreground">
                            Tallinn · 2 bedrooms
                          </p>
                        </div>
                        <SheetFooter>
                          <Button>Open property</Button>
                        </SheetFooter>
                      </SheetContent>
                    </Sheet>
                  </Specimen>

                  <Specimen id="popover" title="Popover">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant="outline">Quick filters</Button>
                      </PopoverTrigger>
                      <PopoverContent align="start">
                        <PopoverHeader>
                          <PopoverTitle>Show properties</PopoverTitle>
                          <PopoverDescription>
                            Choose which listings to include.
                          </PopoverDescription>
                        </PopoverHeader>
                        <div className="mt-3 space-y-3">
                          <Field orientation="horizontal">
                            <Checkbox
                              id="kit-popover-available"
                              defaultChecked
                            />
                            <FieldLabel htmlFor="kit-popover-available">
                              Available
                            </FieldLabel>
                          </Field>
                          <Field orientation="horizontal">
                            <Checkbox id="kit-popover-draft" />
                            <FieldLabel htmlFor="kit-popover-draft">
                              Drafts
                            </FieldLabel>
                          </Field>
                        </div>
                      </PopoverContent>
                    </Popover>
                  </Specimen>
                </div>
              </section>

              <section className="space-y-4" data-catalog-section>
                <SectionHeading
                  id="feedback"
                  eyebrow="Components · 07"
                  title="Feedback & layout"
                  description="Toasts, separators, and loading feedback use the same global tokens."
                  catalogGroup
                />
                <div data-catalog-grid className="grid gap-3 xl:grid-cols-2">
                  <Specimen
                    id="toast"
                    title="Toast notifications"
                    description="Choose one toast type to trigger."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "success",
                          label: "Default · success",
                          preview: (
                            <Button
                              variant="outline"
                              onClick={() =>
                                toast.success("Viewing confirmed", {
                                  description:
                                    "The applicant has been notified.",
                                })
                              }
                            >
                              Show success toast
                            </Button>
                          ),
                        },
                        {
                          value: "info",
                          label: "Info",
                          preview: (
                            <Button
                              variant="outline"
                              onClick={() =>
                                toast("Changes saved", {
                                  description: "Your workspace is up to date.",
                                })
                              }
                            >
                              Show info toast
                            </Button>
                          ),
                        },
                        {
                          value: "error",
                          label: "Error",
                          preview: (
                            <Button
                              variant="outline"
                              onClick={() =>
                                toast.error("Could not save", {
                                  description:
                                    "Check your connection and try again.",
                                })
                              }
                            >
                              Show error toast
                            </Button>
                          ),
                        },
                        {
                          value: "warning",
                          label: "Warning",
                          preview: (
                            <Button
                              variant="outline"
                              onClick={() =>
                                toast.warning("Viewing needs attention", {
                                  description:
                                    "Confirm the time with the applicant.",
                                })
                              }
                            >
                              Show warning toast
                            </Button>
                          ),
                        },
                        {
                          value: "loading",
                          label: "Loading",
                          preview: (
                            <Button
                              variant="outline"
                              onClick={() => toast.loading("Saving changes…")}
                            >
                              Show loading toast
                            </Button>
                          ),
                        },
                      ]}
                    />
                  </Specimen>

                  <Specimen
                    id="separator"
                    title="Separator"
                    description="Choose one separator orientation to preview."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "horizontal",
                          label: "Default · horizontal",
                          preview: <Separator />,
                        },
                        {
                          value: "vertical",
                          label: "Vertical",
                          preview: (
                            <div className="flex h-8 items-center gap-3 text-sm">
                              <span>Overview</span>
                              <Separator orientation="vertical" />
                              <span className="text-muted-foreground">
                                Activity
                              </span>
                            </div>
                          ),
                        },
                      ]}
                    />
                  </Specimen>
                </div>
              </section>

              <section className="space-y-4" data-catalog-section>
                <SectionHeading
                  id="shared-patterns"
                  eyebrow="Components · 08"
                  title="Shared app patterns"
                  description="Reusable product components defined alongside the shared UI primitives."
                  catalogGroup
                />
                <div data-catalog-grid className="grid gap-3 xl:grid-cols-2">
                  <Specimen
                    id="prompt-bar"
                    title="Prompt bar"
                    description="The shared home composer, including its suggestion and disabled states."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "default",
                          label: "Default",
                          preview: (
                            <div className="w-full max-w-xl">
                              <PromptBar
                                placeholder="Ask anything…"
                                onSubmit={() => undefined}
                              />
                            </div>
                          ),
                        },
                        {
                          value: "suggestions",
                          label: "With suggestions",
                          preview: (
                            <div className="w-full max-w-xl">
                              <PromptBar
                                placeholder="Ask anything…"
                                suggestions={[
                                  "Find a property",
                                  "Plan a viewing",
                                ]}
                                onSubmit={() => undefined}
                              />
                            </div>
                          ),
                        },
                        {
                          value: "disabled",
                          label: "Disabled",
                          preview: (
                            <div className="w-full max-w-xl">
                              <PromptBar
                                placeholder="Ask anything…"
                                disabled
                                onSubmit={() => undefined}
                              />
                            </div>
                          ),
                        },
                      ]}
                    />
                  </Specimen>

                  <Specimen
                    id="event-chip"
                    title="Event chip"
                    description="The shared calendar list row with its semantic color tones."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "brand",
                          label: "Default · brand",
                          preview: (
                            <div className="w-full max-w-lg">
                              <EventChip
                                time="09:30"
                                title="Viewing · Harbor House"
                                meta="Today · North Shore Realty"
                              />
                            </div>
                          ),
                        },
                        {
                          value: "agent",
                          label: "Agent",
                          preview: (
                            <div className="w-full max-w-lg">
                              <EventChip
                                tone="agent"
                                time="11:00"
                                title="Agent availability"
                                meta="Today · Tallinn"
                              />
                            </div>
                          ),
                        },
                        {
                          value: "tenant",
                          label: "Tenant",
                          preview: (
                            <div className="w-full max-w-lg">
                              <EventChip
                                tone="tenant"
                                time="14:00"
                                title="Tenant availability"
                                meta="Today · Tallinn"
                              />
                            </div>
                          ),
                        },
                        {
                          value: "owner",
                          label: "Owner",
                          preview: (
                            <div className="w-full max-w-lg">
                              <EventChip
                                tone="owner"
                                time="15:00"
                                title="Owner availability"
                                meta="Today · Tallinn"
                              />
                            </div>
                          ),
                        },
                        {
                          value: "warning",
                          label: "Warning",
                          preview: (
                            <div className="w-full max-w-lg">
                              <EventChip
                                tone="warning"
                                time="16:00"
                                title="Viewing needs attention"
                                meta="Today · Harbor House"
                              />
                            </div>
                          ),
                        },
                        {
                          value: "muted",
                          label: "Muted",
                          preview: (
                            <div className="w-full max-w-lg">
                              <EventChip
                                tone="muted"
                                time="17:00"
                                title="Unavailable"
                                meta="Today · Tallinn"
                              />
                            </div>
                          ),
                        },
                        {
                          value: "accent",
                          label: "External calendar color",
                          preview: (
                            <div className="w-full max-w-lg">
                              <EventChip
                                accent="var(--chart-4)"
                                time="18:00"
                                title="External calendar event"
                                meta="Today · Google Calendar"
                              />
                            </div>
                          ),
                        },
                        {
                          value: "comfortable",
                          label: "Comfortable row",
                          preview: (
                            <div className="w-full max-w-lg">
                              <EventChip
                                comfortable
                                tone="success"
                                time="15:30"
                                title="Viewing confirmed"
                                meta="Tomorrow · Harbor House"
                              />
                            </div>
                          ),
                        },
                      ]}
                    />
                  </Specimen>

                  <Specimen
                    id="calendar-event"
                    title="Calendar event"
                    description="The shared compact event item used in month and week views."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "month",
                          label: "Default · month",
                          preview: (
                            <div className="w-full max-w-52">
                              <CalendarEventPill
                                href="/properties/harbor-house/viewings"
                                time="09:30"
                                title="Viewing · Harbor House"
                                hint="North Shore Realty"
                                status="confirmed"
                                propertyId="harbor-house"
                              />
                            </div>
                          ),
                        },
                        {
                          value: "stacked",
                          label: "Stacked",
                          preview: (
                            <div className="w-full max-w-52">
                              <CalendarEventPill
                                href="/properties/harbor-house/viewings"
                                time="09:30"
                                title="Viewing · Harbor House"
                                hint="North Shore Realty · 2 attendees"
                                status="confirmed"
                                propertyId="harbor-house"
                                stacked
                              />
                            </div>
                          ),
                        },
                        {
                          value: "block",
                          label: "Week block",
                          preview: (
                            <div className="h-20 w-full max-w-52">
                              <CalendarEventPill
                                href="/properties/harbor-house/viewings"
                                time="09:30"
                                title="Viewing · Harbor House"
                                hint="North Shore Realty"
                                status="confirmed"
                                propertyId="harbor-house"
                                block
                              />
                            </div>
                          ),
                        },
                        {
                          value: "deferred-time",
                          label: "Past event · time on hover",
                          preview: (
                            <div className="w-full max-w-52">
                              <CalendarEventPill
                                href="/properties/harbor-house/viewings"
                                time="09:30"
                                title="Viewing · Harbor House"
                                hint="North Shore Realty"
                                status="confirmed"
                                propertyId="harbor-house"
                                deferTime
                              />
                            </div>
                          ),
                        },
                        {
                          value: "completed",
                          label: "Completed",
                          preview: (
                            <div className="w-full max-w-52">
                              <CalendarEventPill
                                href="/properties/harbor-house/viewings"
                                time="09:30"
                                title="Completed viewing"
                                status="completed"
                                propertyId="harbor-house"
                              />
                            </div>
                          ),
                        },
                        {
                          value: "cancelled",
                          label: "Cancelled",
                          preview: (
                            <div className="w-full max-w-52">
                              <CalendarEventPill
                                href="/properties/harbor-house/viewings"
                                time="09:30"
                                title="Cancelled viewing"
                                status="cancelled"
                                propertyId="harbor-house"
                              />
                            </div>
                          ),
                        },
                        {
                          value: "no-show",
                          label: "No show",
                          preview: (
                            <div className="w-full max-w-52">
                              <CalendarEventPill
                                href="/properties/harbor-house/viewings"
                                time="09:30"
                                title="Missed viewing"
                                status="no_show"
                                propertyId="harbor-house"
                              />
                            </div>
                          ),
                        },
                      ]}
                    />
                  </Specimen>

                  <Specimen
                    id="page-header"
                    title="Page header"
                    description="Shared serif title, optional count, description, and page actions."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "default",
                          label: "Default · actions",
                          preview: (
                            <div className="w-full max-w-2xl">
                              <PageHeader
                                title="Properties"
                                titleSuffix="12"
                                description="Manage listings and keep every detail in one place."
                                actions={
                                  <>
                                    <Button variant="outline">Filter</Button>
                                    <Button>Add property</Button>
                                  </>
                                }
                              />
                            </div>
                          ),
                        },
                        {
                          value: "minimal",
                          label: "Title only",
                          preview: (
                            <div className="w-full max-w-2xl">
                              <PageHeader title="Tasks" />
                            </div>
                          ),
                        },
                      ]}
                    />
                  </Specimen>

                  <Specimen
                    id="empty-state"
                    title="Empty state"
                    description="The shared no-results pattern with optional icon, detail, and quiet action."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "default",
                          label: "Default · action",
                          preview: (
                            <div className="w-full max-w-xl">
                              <EmptyState
                                icon={Search01Icon}
                                title="No properties found"
                                description="Try changing your search or add a new property."
                                action={
                                  <Button variant="ghost">Clear filters</Button>
                                }
                              />
                            </div>
                          ),
                        },
                        {
                          value: "minimal",
                          label: "Minimal",
                          preview: (
                            <div className="w-full max-w-xl">
                              <EmptyState title="Nothing to review yet" />
                            </div>
                          ),
                        },
                      ]}
                    />
                  </Specimen>

                  <Specimen
                    id="plan-interval"
                    title="Plan interval"
                    description="The shared monthly and yearly billing switch."
                  >
                    <PlanIntervalPreview />
                  </Specimen>

                  <Specimen
                    id="task-priority"
                    title="Task priority"
                    description="The shared task priority mark used in task lists and summaries."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "low",
                          label: "Low",
                          preview: (
                            <TaskPriorityIcon
                              priority="low"
                              label="Low priority"
                            />
                          ),
                        },
                        {
                          value: "medium",
                          label: "Default · medium",
                          preview: (
                            <TaskPriorityIcon
                              priority="medium"
                              label="Medium priority"
                            />
                          ),
                        },
                        {
                          value: "high",
                          label: "High",
                          preview: (
                            <TaskPriorityIcon
                              priority="high"
                              label="High priority"
                            />
                          ),
                        },
                        {
                          value: "urgent",
                          label: "Urgent",
                          preview: (
                            <TaskPriorityIcon
                              priority="urgent"
                              label="Urgent priority"
                            />
                          ),
                        },
                      ]}
                    />
                  </Specimen>

                  <Specimen
                    id="property-status"
                    title="Property status"
                    description="Lifecycle status badge and its small status dot."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "draft",
                          label: "Draft",
                          preview: <PropertyStatusBadge status="draft" />,
                        },
                        {
                          value: "active",
                          label: "Default · active",
                          preview: <PropertyStatusBadge status="active" />,
                        },
                        {
                          value: "viewing",
                          label: "Viewing in progress",
                          preview: (
                            <PropertyStatusBadge status="viewing_in_progress" />
                          ),
                        },
                        {
                          value: "application-review",
                          label: "Application review",
                          preview: (
                            <PropertyStatusBadge status="application_review" />
                          ),
                        },
                        {
                          value: "contract-pending",
                          label: "Contract pending",
                          preview: (
                            <PropertyStatusBadge status="contract_pending" />
                          ),
                        },
                        {
                          value: "rented",
                          label: "Rented",
                          preview: <PropertyStatusBadge status="rented" />,
                        },
                        {
                          value: "archived",
                          label: "Archived",
                          preview: <PropertyStatusBadge status="archived" />,
                        },
                        {
                          value: "dot",
                          label: "Status dot",
                          preview: (
                            <div className="flex items-center gap-2 text-sm">
                              <PropertyStatusDot status="active" />
                              Active listing
                            </div>
                          ),
                        },
                      ]}
                    />
                  </Specimen>

                  <Specimen
                    id="property-type"
                    title="Property type"
                    description="The shared property type label with its matching icon."
                  >
                    <VariantPreview
                      options={[
                        {
                          value: "apartment",
                          label: "Default · apartment",
                          preview: <PropertyTypeLabel type="apartment" />,
                        },
                        {
                          value: "house",
                          label: "House",
                          preview: <PropertyTypeLabel type="house" />,
                        },
                        {
                          value: "office",
                          label: "Office",
                          preview: <PropertyTypeLabel type="office" />,
                        },
                        {
                          value: "land",
                          label: "Land",
                          preview: <PropertyTypeLabel type="land" />,
                        },
                        {
                          value: "shop",
                          label: "Shop",
                          preview: <PropertyTypeLabel type="shop" />,
                        },
                        {
                          value: "warehouse",
                          label: "Warehouse",
                          preview: <PropertyTypeLabel type="warehouse" />,
                        },
                        {
                          value: "other",
                          label: "Other",
                          preview: <PropertyTypeLabel type="other" />,
                        },
                      ]}
                    />
                  </Specimen>
                </div>
              </section>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
