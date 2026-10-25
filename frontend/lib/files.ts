import { tr } from "./locale";

/** Reads and sanity-checks a scheduling input JSON before it is sent to the backend (which validates fully). */
export async function readScheduleInputFile(file: File): Promise<Record<string, unknown>> {
  if (file.size > 5 * 1024 * 1024) throw new Error(tr("File JSON không được vượt quá 5 MB.", "The JSON file must not exceed 5 MB."));
  const parsed = JSON.parse(await file.text()) as Record<string, unknown>;
  if (typeof parsed.schema_version !== "number") {
    // Tier-1 planner data of the 5-stage model (raw_input.json): stages and run sizes but no runs yet.
    if (Array.isArray(parsed.stages) && parsed.run_size && !Array.isArray(parsed.runs)) {
      throw new Error(tr(
        "Đây là dữ liệu thô tầng 1 (raw_input.json), chưa có danh sách mẻ chạy. Hãy nhập model_input.json cùng thư mục, hoặc sinh lại nó bằng: python dataset/wheel-factory-small/prepare.py <raw_input.json> <model_input.json>.",
        "This is tier-1 raw data (raw_input.json) without the run list. Import the model_input.json next to it, or regenerate it with: python dataset/wheel-factory-small/prepare.py <raw_input.json> <model_input.json>.",
      ));
    }
    throw new Error(tr("File không có trường schema_version hợp lệ.", "The file has no valid schema_version field."));
  }
  return parsed;
}
