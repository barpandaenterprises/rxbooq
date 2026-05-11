import type { PrescriptionItem } from "./patient-history-data";

/**
 * Result of a handwritten-prescription OCR pass. The contract is stable
 * across the mock (this file) and the eventual real service implementation
 * — only the function body changes when we wire Google Cloud Vision /
 * Azure Document Intelligence behind a server action.
 */
export type OcrDraft = {
  /** Raw recognised text from the photo. */
  rawText: string;
  /** Averaged confidence across fields, 0–1. */
  confidence: number;
  /** Best-effort structured items. Always editable in the review UI. */
  items: PrescriptionItem[];
  /** Free-text notes recognised on the slip. */
  notes?: string;
  /** Non-blocking warnings to surface above the review form. */
  warnings?: string[];
};

/**
 * Mock OCR pipeline. Returns a fixed plausible dental Rx after a 1.5s
 * simulated delay so the UI can render its "Recognising handwriting…"
 * state. When this is wired to a real service, replace the body of this
 * function — the type contract stays the same.
 */
export async function recognisePrescription(_file: File): Promise<OcrDraft> {
  await new Promise((resolve) => setTimeout(resolve, 1500));
  return {
    rawText:
      "Cefuroxime 500mg BD x 5d\n" +
      "Aceclofenac+Para BD x 3d\n" +
      "Chlorhexidine MW BD x 7d",
    confidence: 0.86,
    items: [
      {
        medication: "Cefuroxime axetil 500mg",
        dosage: "1 tab",
        frequency: "Twice daily",
        duration: "5 days",
        instructions: "After meals",
      },
      {
        medication: "Aceclofenac 100mg + Paracetamol 325mg",
        dosage: "1 tab",
        frequency: "Twice daily",
        duration: "3 days",
      },
      {
        medication: "Chlorhexidine 0.2% mouthwash",
        dosage: "10 ml",
        frequency: "Twice daily",
        duration: "7 days",
      },
    ],
    warnings: ["One line at the bottom was hard to read — please verify before saving."],
  };
}
