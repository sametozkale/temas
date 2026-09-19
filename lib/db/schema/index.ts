// Single entry point for drizzle-kit and the runtime client.
// One file per docs/03 section; tables never live outside lib/db/schema.

export { authUsers } from "./_shared";
export * from "./identity";
export * from "./contacts";
export * from "./properties";
export * from "./scheduling";
export * from "./forms";
export * from "./inbox";
export * from "./tasks";
export * from "./ai";
