export type Offer = {
  id: string; retailer: string; url: string | null;
  price: string | null; shipping: string | null; mandatory_fees: string | null; total: string | null;
  currency: string; status: "verified" | "unavailable" | "stale" | "mismatch" | "out_of_stock" | "incomplete";
  reason: string; last_checked: string | null; match_confidence: number;
  availability: string; conditional_discounts: { label: string; amount: string | null; conditions: string }[];
  source_kind: string; cached: boolean;
};
export type Comparison = {
  status: "complete" | "unavailable"; source_retailer: string;
  product: { name: string; brand: string; model: string; variant: Record<string, string | number | null>; image_url?: string | null; specifications: Record<string, string>; identifiers: Record<string, string> } | null;
  offers: Offer[]; best_offer_id: string | null;
  coverage: { checked: number; supported: number; verified: number; retailers: string[]; configured: number };
  steps: { id: string; label: string; status: string }[];
  message: string; data_mode: string; generated_at: string;
};
