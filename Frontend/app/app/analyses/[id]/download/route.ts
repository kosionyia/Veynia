import type { NextRequest } from "next/server";

import { ApiError, apiFile } from "@/lib/api";

// ?file= → the FastAPI download it maps to. A fixed list, so the browser can't
// make this route fetch any other API path.
const FILES = {
  "report-pdf": "report?format=pdf",
  "report-docx": "report?format=docx",
  "cv-rewrite": "cv-rewrite",
} as const;

/** Streams a file from FastAPI. Route Handlers, unlike Server Actions, can
 *  return a file the browser downloads. */
export async function GET(request: NextRequest, ctx: RouteContext<"/app/analyses/[id]/download">) {
  const { id } = await ctx.params;
  const file = request.nextUrl.searchParams.get("file");
  if (!file || !Object.hasOwn(FILES, file)) return new Response("Unknown file", { status: 404 });

  let upstream: Response;
  try {
    upstream = await apiFile(`/analyses/${encodeURIComponent(id)}/${FILES[file as keyof typeof FILES]}`);
  } catch (error) {
    if (!(error instanceof ApiError)) throw error;
    return new Response(error.message, { status: error.status, headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Content-Disposition": upstream.headers.get("content-disposition") ?? "attachment",
      // Personal data: never store it in a shared cache.
      "Cache-Control": "private, no-store",
    },
  });
}
