"use client";

import * as React from "react";
import { cn } from "cn";
import { Switch as SwitchPrimitive } from "radix-ui";

/**
 * Visual match for HeroUI v3 Switch (`packages/styles/components/switch.css`):
 * rounded track, wider rounded-rect thumb, margin slide (not a circular pill).
 * Off track uses `--input`; on track uses the design-system brand green.
 */
function Switch({
  className,
  size = "default",
  checked: controlledChecked,
  defaultChecked,
  onCheckedChange,
  onClickCapture,
  ...props
}: React.ComponentProps<typeof SwitchPrimitive.Root> & {
  size?: "sm" | "default" | "lg";
}) {
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState(
    defaultChecked ?? false,
  );
  const [hasInteracted, setHasInteracted] = React.useState(false);
  const checked = controlledChecked ?? uncontrolledChecked;

  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      data-on={checked ? "true" : "false"}
      className={cn(
        "t-toggle peer group/switch relative inline-flex shrink-0 cursor-pointer items-center overflow-hidden outline-none select-none",
        "transition-colors duration-(--duration-quick) ease-(--ease-smooth-out) motion-reduce:transition-none",
        "after:absolute after:-inset-x-3 after:-inset-y-2",
        "focus-visible:ring-3 focus-visible:ring-ring/50",
        "group-has-[:focus-visible]/field-label:ring-0",
        "aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        "data-unchecked:bg-input",
        "data-checked:bg-brand hover:data-checked:bg-brand/90",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        "data-[size=sm]:h-4 data-[size=sm]:w-8 data-[size=sm]:rounded-lg",
        "data-[size=default]:h-5 data-[size=default]:w-10 data-[size=default]:rounded-xl",
        "data-[size=lg]:h-6 data-[size=lg]:w-12 data-[size=lg]:rounded-xl",
        hasInteracted && "is-init",
        className,
      )}
      checked={controlledChecked}
      defaultChecked={defaultChecked}
      onCheckedChange={(next) => {
        setUncontrolledChecked(next);
        onCheckedChange?.(next);
      }}
      onClickCapture={(event) => {
        onClickCapture?.(event);
        if (!event.defaultPrevented && !props.disabled) {
          setHasInteracted(true);
        }
      }}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "t-toggle-thumb pointer-events-none block shrink-0 bg-white text-foreground shadow-[0_0_5px_rgb(0_0_0/0.02),0_2px_10px_rgb(0_0_0/0.06),0_0_1px_rgb(0_0_0/0.3)]",
          "ms-0.5",
          "group-data-[size=sm]/switch:h-3 group-data-[size=sm]/switch:w-[1.03125rem] group-data-[size=sm]/switch:rounded-md",
          "group-data-[size=default]/switch:h-4 group-data-[size=default]/switch:w-[1.375rem] group-data-[size=default]/switch:rounded-lg",
          "group-data-[size=lg]/switch:h-5 group-data-[size=lg]/switch:w-[1.71875rem] group-data-[size=lg]/switch:rounded-xl",
          "dark:bg-foreground",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
