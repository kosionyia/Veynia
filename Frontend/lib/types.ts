import type { components } from "./api-types";

// Generated from FastAPI's OpenAPI schema: `bun run gen:api` with the backend running.
type Schemas = components["schemas"];

export type User = Schemas["MeOut"];
export type Token = Schemas["TokenOut"];
export type AnalysisSummary = Schemas["AnalysisSummary"];
export type AnalysisDetail = Schemas["AnalysisDetail"];
export type AnalysisStatus = AnalysisSummary["status"];
export type RequirementResult = Schemas["RequirementResult"];
export type Verdict = RequirementResult["status"];
export type Suggestion = Schemas["Suggestion"];
export type ApplicationStats = Schemas["ApplicationStats"];
export type CVSummary = Schemas["CVSummary"];
export type CVDetail = Schemas["CVDetail"];
export type JobDetail = Schemas["JobDetail"];
export type JobSummary = Schemas["JobSummary"];
export type Application = Schemas["ApplicationOut"];
export type ApplicationStatus = Application["status"];
