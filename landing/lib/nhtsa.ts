export type NhtsaDecodedVin = {
  vin: string;
  make: string;
  model: string;
  modelYear: string;
  bodyClass: string;
  gvwr: string;
  vehicleType: string;
};

export type NhtsaRecall = {
  nhtsaCampaignNumber: string;
  component: string;
  summary: string;
  consequence: string;
  remedy: string;
  make: string;
  model: string;
  modelYear: string;
};

/**
 * Batch VIN decode via NHTSA vPIC API. No auth required.
 * Batches of up to 50 VINs per request.
 */
export async function decodeVinBatch(vins: string[]): Promise<NhtsaDecodedVin[]> {
  if (vins.length === 0) return [];

  const results: NhtsaDecodedVin[] = [];
  const batchSize = 50;

  for (let i = 0; i < vins.length; i += batchSize) {
    const batch = vins.slice(i, i + batchSize);
    const vinString = batch.join(";");

    const res = await fetch(
      "https://vpic.nhtsa.dot.gov/api/vehicles/DecodeVINValuesBatch/",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `DATA=${encodeURIComponent(vinString)}&format=json`,
        next: { revalidate: 3600 },
      }
    );

    if (!res.ok) continue;

    const data = await res.json();
    const records = data?.Results ?? [];

    for (const r of records) {
      if (!r.VIN) continue;
      results.push({
        vin: r.VIN,
        make: r.Make || "",
        model: r.Model || "",
        modelYear: r.ModelYear || "",
        bodyClass: r.BodyClass || "",
        gvwr: r.GVWR || "",
        vehicleType: r.VehicleType || "",
      });
    }
  }

  return results;
}

/**
 * Get recalls by vehicle from NHTSA Recalls API. No auth required.
 */
export async function getRecallsByVehicle(
  make: string,
  model: string,
  year: string
): Promise<NhtsaRecall[]> {
  if (!make || !model || !year) return [];

  const url = `https://api.nhtsa.gov/recalls/recallsByVehicle?make=${encodeURIComponent(make)}&model=${encodeURIComponent(model)}&modelYear=${encodeURIComponent(year)}`;

  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return [];

  const data = await res.json();
  const results = data?.results ?? [];

  return results.map((r: Record<string, string>) => ({
    nhtsaCampaignNumber: r.NHTSACampaignNumber || "",
    component: r.Component || "",
    summary: r.Summary || "",
    consequence: r.Consequence || "",
    remedy: r.Remedy || "",
    make,
    model,
    modelYear: year,
  }));
}
