/** Dotted canvas behind the property map and its loading state. */
export const MAP_CANVAS_CLASS =
  "relative min-h-0 flex-1 overflow-hidden rounded-lg bg-muted/40";

export const MAP_DOT_STYLE = {
  backgroundImage:
    "radial-gradient(circle, var(--border) 1px, transparent 1px)",
} as const;

/** Shared sizes so the loading state lines up with the real map. */
export const MAP_PARTY_WIDTH = "w-max";
export const MAP_PROPERTY_WIDTH = "w-max";
/**
 * Both horizontal links share this width, so the property stays centred
 * between the agent and the tenant. It is wider than a share chip, which
 * leaves the dashed line visible on both sides.
 */
export const MAP_LINK_X = "w-56";
/**
 * Owner sits above the property on a shorter run than the side connectors,
 * long enough that the share chip still has dashed line on both sides.
 */
export const MAP_LINK_OWNER = "h-40";
export const MAP_LINK_Y = "h-20";
export const MAP_STAGE_WIDTH = "10.5rem";
