"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { api, ApiError } from "@/lib/api";
import { MAX_CV_BYTES } from "@/lib/format";
import type { CVDetail } from "@/lib/types";

export type CVFormState = { error?: string };

function failure(error: unknown): CVFormState {
  if (error instanceof ApiError) return { error: error.problem.fieldErrors.name ?? error.message };
  throw error;
}

export async function uploadCV(_prev: CVFormState, form: FormData): Promise<CVFormState> {
  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a PDF or Word file to upload." };
  if (file.size > MAX_CV_BYTES) return { error: "The file is larger than 5 MB." };

  const body = new FormData();
  body.append("file", file, file.name);
  let cv: CVDetail;
  try {
    // No Content-Type header: fetch sets multipart/form-data with the boundary.
    cv = await api<CVDetail>("/cvs", { body });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/app/cvs");
  // Straight to the CV, so the user sees what we read from it.
  redirect(`/app/cvs/${cv.id}`);
}

export async function renameCV(id: string, _prev: CVFormState, form: FormData): Promise<CVFormState> {
  const name = String(form.get("name") ?? "").trim();
  if (!name) return { error: "Enter a name." };
  try {
    await api(`/cvs/${encodeURIComponent(id)}`, { method: "PATCH", json: { name } });
  } catch (error) {
    return failure(error);
  }
  revalidatePath("/app/cvs");
  revalidatePath(`/app/cvs/${id}`);
  return {};
}

export async function deleteCV(id: string): Promise<CVFormState> {
  try {
    await api(`/cvs/${encodeURIComponent(id)}`, { method: "DELETE" });
  } catch (error) {
    // Already gone counts as deleted.
    if (!(error instanceof ApiError && error.status === 404)) return failure(error);
  }
  revalidatePath("/app/cvs");
  redirect("/app/cvs");
}
