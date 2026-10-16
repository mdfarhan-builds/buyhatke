export type PricePoint = {
  date: string;
  price: string | number;
  retailer: string;
};

export type PriceHistory = {
  lowest: string | number;
  highest: string | number;
  average: string | number;
  current: string | number;
  drop_percentage: number;
  verdict: string;
  history: PricePoint[];
};

export type Offer = {
  id: string;
  retailer: string;
  url: string | null;
  price: string | null;
  shipping: string | null;
  mandatory_fees: string | null;
  total: string | null;
  currency: string;
  status: "verified" | "unavailable" | "stale" | "mismatch" | "out_of_stock" | "incomplete";
  reason: string;
  last_checked: string | null;
  match_confidence: number;
  availability: string;
  conditional_discounts: { label: string; amount: string | null; conditions: string }[];
  source_kind: string;
  cached: boolean;
};

export type Comparison = {
  status: "complete" | "unavailable";
  source_retailer: string;
  product: {
    name: string;
    brand: string;
    model: string;
    variant: Record<string, string | number | null>;
    image_url?: string | null;
    specifications: Record<string, string>;
    identifiers: Record<string, string>;
  } | null;
  offers: Offer[];
  best_offer_id: string | null;
  coverage: { checked: number; supported: number; verified: number; retailers: string[]; configured: number };
  steps: { id: string; label: string; status: string }[];
  message: string;
  data_mode: string;
  generated_at: string;
  price_history?: PriceHistory | null;
};
