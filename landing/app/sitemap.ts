import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://fleetsight.vercel.app";

  // Static pages
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
    { url: `${baseUrl}/dashboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.8 },
  ];

  // Top carriers by DOT number — major carriers that people search for frequently
  // These get their own public profile pages at /carrier/[dotNumber]
  const topCarriers = [
    69495,     // SWIFT TRANSPORTATION
    2247837,   // PRIME INC
    624899,    // SCHNEIDER NATIONAL CARRIERS
    524760,    // WERNER ENTERPRISES
    470636,    // J.B. HUNT TRANSPORT
    526209,    // HEARTLAND EXPRESS
    68026,     // YRC FREIGHT
    651020,    // KNIGHT TRANSPORTATION
    75982,     // OLD DOMINION FREIGHT LINE
    145770,    // USF HOLLAND
    75100,     // COVENANT TRANSPORT
    1004179,   // SAIA
    308457,    // UPS FREIGHT
    116810,    // FEDEX FREIGHT
    602283,    // CELADON TRUCKING
    823783,    // USA TRUCK
    594939,    // MARTEN TRANSPORT
    123463,    // ESTES EXPRESS LINES
    382820,    // XPO LOGISTICS
    2228340,   // AMAZON LOGISTICS
    73655,     // ABF FREIGHT SYSTEM
    571206,    // RYDER TRUCK RENTAL
    78564,     // SOUTHEASTERN FREIGHT LINES
    594605,    // AVERITT EXPRESS
    65311,     // AAA COOPER TRANSPORTATION
    584167,    // PAM TRANSPORT
    69672,     // CRETE CARRIER CORPORATION
    237074,    // LANDSTAR SYSTEM
    578299,    // CENTRAL TRANSPORT
    521035,    // WESTERN EXPRESS
    1032993,   // C.R. ENGLAND
    597399,    // MERCER TRANSPORTATION
    95490,     // DAYTON FREIGHT LINES
    578413,    // CENTRAL TRANSPORT
    2312438,   // UBER FREIGHT
    43437,     // ROADWAY EXPRESS
    130800,    // CON-WAY FREIGHT
    90618,     // R+L CARRIERS
    584928,    // HEARTLAND EXPRESS
    70977,     // ARKANSAS BEST CORPORATION
  ];

  const carrierPages: MetadataRoute.Sitemap = topCarriers.map((dot) => ({
    url: `${baseUrl}/carrier/${dot}`,
    lastModified: new Date(),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  return [...staticPages, ...carrierPages];
}
