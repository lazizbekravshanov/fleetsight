import { CarrierConsole } from "@/components/agent/carrier-console";

export const dynamic = "force-dynamic";

export default function ConsolePage({ params }: { params: { dotNumber: string } }) {
  return <CarrierConsole dotNumber={params.dotNumber} />;
}
