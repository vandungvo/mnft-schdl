import { tr } from "./locale";

/** Reads and sanity-checks a scheduling input JSON before it is sent to the backend (which validates fully). */
export async function readScheduleInputFile(file: File): Promise<Record<string, unknown>> {
  if (file.size > 5 * 1024 * 1024) throw new Error(tr("File JSON không được vượt quá 5 MB.", "The JSON file must not exceed 5 MB."));
  const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
  if (typeof parsed.schema_version !== "number") throw new Error(tr("File không có trường schema_version hợp lệ.", "The file has no valid schema_version field."));
  return parsed;
}
