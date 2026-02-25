import Stripe from "stripe";

let _stripe: Stripe | null = null;

export function getStripe(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: "2026-02-25.clover",
    });
  }
  return _stripe;
}

export type CreditPack = {
  id: string;
  credits: number;
  priceCents: number;
  label: string;
  priceLabel: string;
};

export const CREDIT_PACKS: CreditPack[] = [
  { id: "pack_50", credits: 50, priceCents: 500, label: "50 Credits", priceLabel: "$5" },
  { id: "pack_200", credits: 200, priceCents: 1500, label: "200 Credits", priceLabel: "$15" },
  { id: "pack_500", credits: 500, priceCents: 3000, label: "500 Credits", priceLabel: "$30" },
];
