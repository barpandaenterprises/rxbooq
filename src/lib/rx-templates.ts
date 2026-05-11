import type { PrescriptionItem } from "./patient-history-data";

export type RxTemplate = {
  id: string;
  label: string;
  description: string;
  icon: string; // FontAwesome name
  items: PrescriptionItem[];
  notes?: string;
};

export const RX_TEMPLATES: RxTemplate[] = [
  {
    id: "rct_post_op",
    label: "Root Canal · Post-op",
    description: "Standard antibiotic + NSAID cover after pulp extirpation / obturation.",
    icon: "fa-tooth",
    items: [
      { medication: "Cefuroxime axetil 500mg",                dosage: "1 tab", frequency: "Twice daily",  duration: "5 days", instructions: "After meals" },
      { medication: "Aceclofenac 100mg + Paracetamol 325mg",  dosage: "1 tab", frequency: "Twice daily",  duration: "3 days", instructions: "Only if pain persists" },
    ],
    notes: "Soft food for 24 hours. Avoid chewing on the treated side.",
  },
  {
    id: "extraction_post_op",
    label: "Tooth extraction · Post-op",
    description: "Extraction socket prophylaxis with mouthwash + analgesia.",
    icon: "fa-prescription-bottle",
    items: [
      { medication: "Amoxicillin + Clavulanic acid 625mg",    dosage: "1 tab", frequency: "Twice daily",  duration: "5 days" },
      { medication: "Aceclofenac 100mg + Paracetamol 325mg",  dosage: "1 tab", frequency: "Twice daily",  duration: "3 days" },
      { medication: "Chlorhexidine 0.2% mouthwash",            dosage: "10 ml", frequency: "Twice daily",  duration: "7 days", instructions: "Start 24h after extraction; rinse for 30s" },
    ],
    notes: "No spitting / rinsing / smoking for 24 hours. Return for suture removal in 7 days.",
  },
  {
    id: "cleaning_aftercare",
    label: "Scaling & polishing aftercare",
    description: "No Rx — just home-care instructions. Use this for hygiene visits.",
    icon: "fa-broom",
    items: [],
    notes: "Sensodyne or similar desensitising paste for 1 week. Floss daily. Recall in 6 months.",
  },
  {
    id: "whitening_aftercare",
    label: "Whitening aftercare",
    description: "Sensitivity management after in-clinic whitening.",
    icon: "fa-magic",
    items: [
      { medication: "Sensodyne / Colgate Pro-Relief paste", dosage: "Pea-sized", frequency: "Twice daily", duration: "14 days", instructions: "Use a soft-bristle brush" },
    ],
    notes: "Avoid coffee / tea / smoking / dark beverages for 48 hours. Mild sensitivity is normal for 1–3 days.",
  },
  {
    id: "pediatric_caries",
    label: "Pediatric caries",
    description: "Antibiotic syrup + analgesia for children's caries pain.",
    icon: "fa-baby",
    items: [
      { medication: "Amoxicillin 250mg/5ml syrup",     dosage: "5 ml",   frequency: "Thrice daily", duration: "5 days", instructions: "Shake well before use" },
      { medication: "Paracetamol 250mg/5ml syrup",     dosage: "5 ml",   frequency: "When needed", duration: "3 days", instructions: "Max 4 doses in 24h" },
    ],
    notes: "Soft diet for 48h. Avoid hard / sticky foods.",
  },
];

export function getTemplate(id: string): RxTemplate | undefined {
  return RX_TEMPLATES.find((t) => t.id === id);
}
