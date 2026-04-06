/**
 * check_voip_phone — detect VoIP/burner phone indicators on a phone number.
 *
 * VoIP numbers on registered carriers are weakly associated with shell
 * carriers and chameleon operations.
 */

import { checkVoipIndicators } from "@/lib/voip-check";
import type { AgentTool } from "../types";

type Output = ReturnType<typeof checkVoipIndicators>;

export const checkVoipPhone: AgentTool<{ phone: string }, Output> = {
  name: "check_voip_phone",
  description:
    "Check whether a phone number is likely a VoIP/burner line vs. a real landline or mobile. VoIP-only carriers are a weak shell-carrier signal worth surfacing alongside other anomalies.",
  inputSchema: {
    type: "object",
    required: ["phone"],
    properties: { phone: { type: "string", description: "Phone number, any format" } },
  },
  async execute({ phone }) {
    return checkVoipIndicators(phone);
  },
  summarize(out) {
    const o = out as { isLikelyVoip?: boolean; carrier?: string; reason?: string };
    if (o.isLikelyVoip) return `Likely VoIP${o.carrier ? ` (${o.carrier})` : ""}${o.reason ? ` — ${o.reason}` : ""}`;
    return o.carrier ? `Carrier: ${o.carrier}` : "Not flagged as VoIP";
  },
  serializeForModel(out) {
    return JSON.stringify(out);
  },
};
