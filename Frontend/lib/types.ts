import type { components } from "./api-types";

// Generated from FastAPI's OpenAPI schema: `bun run gen:api` with the backend running.
type Schemas = components["schemas"];

export type User = Schemas["UserOut"];
export type Token = Schemas["TokenOut"];
