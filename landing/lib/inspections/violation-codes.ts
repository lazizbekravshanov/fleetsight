/**
 * FMCSA Violation Code Reference Table
 *
 * Maps violation codes to groups, descriptions, severities, and actionable
 * fix/check items. Used throughout the inspection intelligence system for
 * categorization, risk scoring, and pre-trip checklist generation.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ViolationGroup =
  | 'BRAKES'
  | 'LIGHTING'
  | 'TIRES_WHEELS'
  | 'DRIVER_FITNESS'
  | 'HOS'
  | 'CARGO_SECUREMENT'
  | 'HAZMAT'
  | 'VEHICLE_MAINTENANCE'
  | 'SUSPENSION'
  | 'STEERING'
  | 'EXHAUST'
  | 'FUEL_SYSTEM'
  | 'COUPLING'
  | 'FRAME'
  | 'WINDSHIELD_GLASS'
  | 'GENERAL'
  | 'OTHER';

export type ViolationCodeInfo = {
  code: string;
  group: ViolationGroup;
  section: string;
  description: string;
  severity: 'critical' | 'serious' | 'other';
  fixAction: string;
  checkItem: string;
};

// ---------------------------------------------------------------------------
// Group metadata
// ---------------------------------------------------------------------------

export const VIOLATION_GROUPS: Record<
  ViolationGroup,
  { displayName: string; description: string }
> = {
  BRAKES: {
    displayName: 'Brakes',
    description:
      'Brake system components including air brakes, hydraulic brakes, ABS, adjustment, and parking brakes.',
  },
  LIGHTING: {
    displayName: 'Lighting',
    description:
      'Lamps, reflectors, clearance lights, turn signals, and all required lighting equipment.',
  },
  TIRES_WHEELS: {
    displayName: 'Tires & Wheels',
    description:
      'Tire condition, tread depth, inflation, wheel fasteners, rims, and related components.',
  },
  DRIVER_FITNESS: {
    displayName: 'Driver Fitness',
    description:
      'Medical certification, CDL validity, endorsements, qualifications, and driver records.',
  },
  HOS: {
    displayName: 'Hours of Service',
    description:
      'Driving time limits, rest periods, ELD compliance, record of duty status, and log books.',
  },
  CARGO_SECUREMENT: {
    displayName: 'Cargo Securement',
    description:
      'Tiedowns, blocking, bracing, load distribution, and securement devices per FMCSA rules.',
  },
  HAZMAT: {
    displayName: 'Hazardous Materials',
    description:
      'Placarding, shipping papers, hazmat training, packaging integrity, and security plans.',
  },
  VEHICLE_MAINTENANCE: {
    displayName: 'Vehicle Maintenance',
    description:
      'Periodic inspection records, DVIR, systematic maintenance programs, and general upkeep.',
  },
  SUSPENSION: {
    displayName: 'Suspension',
    description:
      'Leaf springs, air bags, U-bolts, shock absorbers, and suspension mounting hardware.',
  },
  STEERING: {
    displayName: 'Steering',
    description:
      'Steering column, gear box, linkage, power steering, and related components.',
  },
  EXHAUST: {
    displayName: 'Exhaust System',
    description:
      'Exhaust piping, muffler, leak points, and discharge location compliance.',
  },
  FUEL_SYSTEM: {
    displayName: 'Fuel System',
    description:
      'Fuel tanks, caps, lines, mounting, and leak prevention.',
  },
  COUPLING: {
    displayName: 'Coupling Devices',
    description:
      'Fifth wheel, pintle hook, drawbar, safety chains, and kingpin assemblies.',
  },
  FRAME: {
    displayName: 'Frame',
    description:
      'Frame rails, cross members, fasteners, and structural integrity.',
  },
  WINDSHIELD_GLASS: {
    displayName: 'Windshield & Glass',
    description:
      'Windshield condition, wipers, defroster, mirrors, and required glazing.',
  },
  GENERAL: {
    displayName: 'General Vehicle',
    description:
      'Miscellaneous vehicle defects including horn, mirrors, body condition, and emergency equipment.',
  },
  OTHER: {
    displayName: 'Other',
    description:
      'Violations that do not fit into a standard group or are administrative in nature.',
  },
};

// ---------------------------------------------------------------------------
// Violation code entries
// ---------------------------------------------------------------------------

const entries: ViolationCodeInfo[] = [
  // =========================================================================
  // BRAKES
  // =========================================================================
  {
    code: '396.3(a)(1)',
    group: 'BRAKES',
    section: '396.3(a)(1)',
    description: 'Inoperative or defective brakes',
    severity: 'critical',
    fixAction:
      'Inspect every brake on every axle. Replace worn pads/shoes, repair or replace defective chambers, slack adjusters, or calipers. Road-test to confirm proper stopping.',
    checkItem: 'All foundation brakes operational with adequate lining thickness',
  },
  {
    code: '393.45(a)(1)',
    group: 'BRAKES',
    section: '393.45(a)(1)',
    description: 'Brake tubing and hose adequacy — chafing or restricted',
    severity: 'critical',
    fixAction:
      'Trace all air/hydraulic lines from compressor to chambers. Replace any line that is chafed through, kinked, cracked, or swollen. Re-secure with proper clamps.',
    checkItem: 'Brake hoses and tubing free of chafing, kinks, and leaks',
  },
  {
    code: '393.45(b)(1)',
    group: 'BRAKES',
    section: '393.45(b)(1)',
    description: 'Brake hose or tubing — audible air leak',
    severity: 'critical',
    fixAction:
      'Build system to full pressure. Listen and soap-test every fitting, glad hand, and line. Replace leaking hose/tubing and reseat fittings.',
    checkItem: 'No audible air leaks at brake hoses, tubing, and fittings',
  },
  {
    code: '393.45(d)',
    group: 'BRAKES',
    section: '393.45(d)',
    description: 'Brake hose or tubing — constriction or damage',
    severity: 'serious',
    fixAction:
      'Replace any hose that shows crimping, kinking, or internal collapse. Verify full pressure delivery at each chamber.',
    checkItem: 'Brake hoses free of constriction and external damage',
  },
  {
    code: '393.47(a)',
    group: 'BRAKES',
    section: '393.47(a)',
    description: 'Brake lining/pad thickness less than minimum',
    severity: 'critical',
    fixAction:
      'Measure all brake linings. Replace any lining worn to less than 1/4 inch (or rivet heads within 1/16 inch of surface). Replace in axle pairs.',
    checkItem: 'Brake lining thickness at or above minimum 1/4 inch',
  },
  {
    code: '393.47(b)',
    group: 'BRAKES',
    section: '393.47(b)',
    description: 'Brake lining — cracks or loose segments',
    severity: 'critical',
    fixAction:
      'Remove and replace any cracked, contaminated, or loose brake lining. Inspect drum/rotor surface for scoring and resurface if needed.',
    checkItem: 'Brake linings intact with no cracks, contamination, or loose segments',
  },
  {
    code: '393.47(d)',
    group: 'BRAKES',
    section: '393.47(d)',
    description: 'Clamp or roto-chamber brake out of adjustment',
    severity: 'critical',
    fixAction:
      'Measure pushrod stroke at each brake. Readjust automatic slack adjusters or replace if they will not hold adjustment. Re-measure after test stop.',
    checkItem: 'Brake pushrod stroke within adjustment limits at every wheel',
  },
  {
    code: '393.47(e)',
    group: 'BRAKES',
    section: '393.47(e)',
    description: 'Brake drum/rotor — cracked or in unsafe condition',
    severity: 'critical',
    fixAction:
      'Remove wheels and inspect drums/rotors. Replace any drum with visible cracks, heat checking beyond limits, or worn past discard diameter.',
    checkItem: 'Brake drums and rotors free of cracks and within wear limits',
  },
  {
    code: '393.48(a)',
    group: 'BRAKES',
    section: '393.48(a)',
    description: 'Inoperative or missing ABS on power unit',
    severity: 'serious',
    fixAction:
      'Scan ABS module for fault codes. Repair or replace faulty wheel speed sensors, modulators, or ECU. Verify ABS lamp self-test on key-on.',
    checkItem: 'ABS malfunction lamp cycles off after bulb check at key-on',
  },
  {
    code: '393.43(a)',
    group: 'BRAKES',
    section: '393.43(a)',
    description: 'No or defective automatic brake adjusters',
    severity: 'critical',
    fixAction:
      'Replace non-functioning automatic slack adjusters on all affected positions. Verify free stroke and applied stroke after replacement.',
    checkItem: 'Automatic slack adjusters present and functioning on every air-braked axle',
  },
  {
    code: '393.40(b)',
    group: 'BRAKES',
    section: '393.40(b)',
    description: 'Insufficient braking force on an axle — 20 percent or more defective',
    severity: 'critical',
    fixAction:
      'Perform full brake inspection on every axle. Ensure no more than 20% of brakes on any axle are defective. Repair or replace as needed.',
    checkItem: 'All brakes on every axle produce adequate stopping force',
  },
  {
    code: '393.41(b)',
    group: 'BRAKES',
    section: '393.41(b)',
    description: 'Parking brake — inoperative or missing',
    severity: 'critical',
    fixAction:
      'Test parking brake with vehicle on grade. Repair or replace spring brake chambers, control valve, or linkage as needed.',
    checkItem: 'Parking brake holds vehicle stationary on grade when applied',
  },
  {
    code: '393.42(a)',
    group: 'BRAKES',
    section: '393.42(a)',
    description: 'No or defective low air pressure warning device',
    severity: 'critical',
    fixAction:
      'Test low-air warning by pumping brakes until pressure drops below 60 psi. If buzzer/light fails to activate, replace sensor or indicator.',
    checkItem: 'Low air pressure warning activates before pressure drops below 60 psi',
  },
  {
    code: '393.50',
    group: 'BRAKES',
    section: '393.50',
    description: 'Inadequate reservoir capacity for air brake system',
    severity: 'serious',
    fixAction:
      'Inspect air tanks for proper volume. Check governor cut-in/cut-out pressures. Replace or add reservoirs if system cannot sustain repeated applications.',
    checkItem: 'Air reservoir capacity adequate for full-brake repeated applications',
  },

  // =========================================================================
  // LIGHTING
  // =========================================================================
  {
    code: '393.9(a)',
    group: 'LIGHTING',
    section: '393.9(a)',
    description: 'Inoperative required lamp — head, tail, stop, or turn signal',
    severity: 'serious',
    fixAction:
      'Replace burned-out bulbs, repair wiring faults, clean corroded sockets. Confirm every required lamp illuminates at proper brightness.',
    checkItem: 'All headlamps, taillamps, stop lamps, and turn signals operational',
  },
  {
    code: '393.11(a)',
    group: 'LIGHTING',
    section: '393.11(a)',
    description: 'No or inoperative reflectors/reflective sheeting',
    severity: 'other',
    fixAction:
      'Install required red reflectors on rear, amber on sides. Replace faded or cracked reflectors. Verify conspicuity tape coverage meets FMVSS 108.',
    checkItem: 'All required reflectors and conspicuity tape present and visible',
  },
  {
    code: '393.17',
    group: 'LIGHTING',
    section: '393.17',
    description: 'Lamp not steady burning — flickering or intermittent',
    severity: 'other',
    fixAction:
      'Trace wiring from lamp back to switch. Repair loose grounds, corroded connectors, or chafed wires causing intermittent contact.',
    checkItem: 'All required lamps burn steadily without flickering',
  },
  {
    code: '393.19',
    group: 'LIGHTING',
    section: '393.19',
    description: 'Required hazard warning signal inoperative',
    severity: 'serious',
    fixAction:
      'Test 4-way flasher operation. Replace flasher relay, fuse, or switch as needed. Verify all four corners flash simultaneously.',
    checkItem: 'Hazard warning flashers operational on all four corners',
  },
  {
    code: '393.23(a)',
    group: 'LIGHTING',
    section: '393.23(a)',
    description: 'Required clearance/ID lamps missing or inoperative on vehicles over 80 inches',
    severity: 'serious',
    fixAction:
      'Replace or install amber front and red rear clearance and identification lamps. Verify proper mounting height and visibility.',
    checkItem: 'All clearance and identification lamps present and illuminating',
  },
  {
    code: '393.24(c)',
    group: 'LIGHTING',
    section: '393.24(c)',
    description: 'Stop lamp inoperative',
    severity: 'serious',
    fixAction:
      'Replace stop lamp bulb, check brake light switch, and test wiring continuity. Verify both/all stop lamps illuminate on brake application.',
    checkItem: 'Stop lamps illuminate immediately on brake pedal application',
  },
  {
    code: '393.25(a)',
    group: 'LIGHTING',
    section: '393.25(a)',
    description: 'Inoperative/missing lamps on projecting load',
    severity: 'other',
    fixAction:
      'Attach amber and red lamps or flags to any load extending 4+ feet beyond the rear. Secure wiring to prevent chafing.',
    checkItem: 'Projecting loads marked with required lamps or flags',
  },
  {
    code: '393.25(e)',
    group: 'LIGHTING',
    section: '393.25(e)',
    description: 'No or defective side marker lamps',
    severity: 'other',
    fixAction:
      'Install or replace amber front-side and red rear-side marker lamps. Verify lens color and steady illumination.',
    checkItem: 'Side marker lamps present on both sides, amber forward and red rearward',
  },

  // =========================================================================
  // TIRES & WHEELS
  // =========================================================================
  {
    code: '393.75(a)(1)',
    group: 'TIRES_WHEELS',
    section: '393.75(a)(1)',
    description: 'Flat tire or fabric exposed through tread or sidewall',
    severity: 'critical',
    fixAction:
      'Replace the tire immediately. Inspect rim for damage before mounting new tire. Torque lug nuts to spec.',
    checkItem: 'No flat tires; no cord or fabric visible on tread or sidewall',
  },
  {
    code: '393.75(a)(2)',
    group: 'TIRES_WHEELS',
    section: '393.75(a)(2)',
    description: 'Tire tread depth less than 2/32 inch on any major groove',
    severity: 'critical',
    fixAction:
      'Measure tread depth in all major grooves with a gauge. Replace any tire below 2/32 inch (steer axle: 4/32 inch). Replace in pairs where possible.',
    checkItem: 'Tread depth at or above 2/32 inch (4/32 steer) in all major grooves',
  },
  {
    code: '393.75(a)(3)',
    group: 'TIRES_WHEELS',
    section: '393.75(a)(3)',
    description: 'Tire with body ply or belt material exposed',
    severity: 'critical',
    fixAction:
      'Remove tire from service immediately. Inspect casing for cause (under-inflation, alignment, overload). Mount replacement.',
    checkItem: 'No belt or body ply material exposed on any tire',
  },
  {
    code: '393.75(a)(4)',
    group: 'TIRES_WHEELS',
    section: '393.75(a)(4)',
    description: 'Tire with tread or sidewall separation',
    severity: 'critical',
    fixAction:
      'Replace the tire. Check adjacent tires for early signs of tread lifting. Verify correct inflation pressure on all tires.',
    checkItem: 'No tread or sidewall separation, bulges, or blisters on any tire',
  },
  {
    code: '393.75(c)',
    group: 'TIRES_WHEELS',
    section: '393.75(c)',
    description: 'Tire load rating exceeded or under-inflated for load',
    severity: 'serious',
    fixAction:
      'Weigh axle loads. Cross-reference tire load range with actual load. Replace undersized tires or redistribute cargo. Inflate to sidewall rating.',
    checkItem: 'Every tire rated for and inflated to the load it is carrying',
  },
  {
    code: '393.75(d)',
    group: 'TIRES_WHEELS',
    section: '393.75(d)',
    description: 'Tire on front steering axle regrooved or recap (bus/truck over 10,000 GVWR)',
    severity: 'serious',
    fixAction:
      'Replace any retreaded, regrooved, or recap tire found on the steer axle with a new tire of proper size and load rating.',
    checkItem: 'Steer-axle tires are not retreads or regrooved',
  },
  {
    code: '393.75(g)',
    group: 'TIRES_WHEELS',
    section: '393.75(g)',
    description: 'Tire — cut exposing ply and/or belt material',
    severity: 'critical',
    fixAction:
      'Replace the tire. Inspect wheel well and suspension for any component that may have caused the cut.',
    checkItem: 'No cuts or snags deep enough to expose ply or belt material',
  },
  {
    code: '393.205(a)',
    group: 'TIRES_WHEELS',
    section: '393.205(a)',
    description: 'Wheel/rim — cracked or broken',
    severity: 'critical',
    fixAction:
      'Remove and replace the damaged wheel or rim. Inspect hub, studs, and bearings before mounting replacement. Torque to spec.',
    checkItem: 'All wheels and rims free of cracks, breaks, or elongated bolt holes',
  },
  {
    code: '393.205(b)',
    group: 'TIRES_WHEELS',
    section: '393.205(b)',
    description: 'Wheel fasteners — loose, missing, or ineffective',
    severity: 'critical',
    fixAction:
      'Torque all lug nuts/bolts to manufacturer spec. Replace any missing, stripped, or damaged fasteners. Re-check after 50 miles.',
    checkItem: 'All wheel fasteners present, tight, and not damaged or re-welded',
  },

  // =========================================================================
  // HOURS OF SERVICE
  // =========================================================================
  {
    code: '395.8(a)',
    group: 'HOS',
    section: '395.8(a)',
    description: 'No record of duty status (RODS/log) for current day',
    severity: 'critical',
    fixAction:
      'Driver must immediately complete a record of duty status for the current 24-hour period. Ensure ELD is powered on and recording.',
    checkItem: 'Current-day record of duty status is complete and available for inspection',
  },
  {
    code: '395.8(e)',
    group: 'HOS',
    section: '395.8(e)',
    description: 'Driver record of duty status not current (not updated within 13 miles / end of each duty status change)',
    severity: 'serious',
    fixAction:
      'Update all duty status changes within required timeframe. Annotate ELD with any missing entries. Train driver on edit procedures.',
    checkItem: 'RODS reflect every duty status change up to current time',
  },
  {
    code: '395.8(k)(2)',
    group: 'HOS',
    section: '395.8(k)(2)',
    description: 'Driver failing to retain previous 7/8 days of RODS',
    severity: 'serious',
    fixAction:
      'Ensure driver keeps paper backup or ELD data for the prior 7 consecutive days (8 for 70-hour carriers). Download and store records.',
    checkItem: 'Previous 7/8 days of RODS available for inspection in cab',
  },
  {
    code: '395.3(a)(1)',
    group: 'HOS',
    section: '395.3(a)(1)',
    description: 'Driving beyond 11-hour driving limit',
    severity: 'critical',
    fixAction:
      'Driver must cease driving immediately and take a full 10-hour off-duty/sleeper period before driving again.',
    checkItem: 'Total driving time does not exceed 11 hours since last 10-hour break',
  },
  {
    code: '395.3(a)(2)',
    group: 'HOS',
    section: '395.3(a)(2)',
    description: 'Driving beyond 14-hour duty window',
    severity: 'critical',
    fixAction:
      'Driver must stop driving. The 14-hour window cannot be extended. A new 10-hour off-duty period is required to reset.',
    checkItem: 'Driving occurs only within 14 hours of coming on duty',
  },
  {
    code: '395.3(b)',
    group: 'HOS',
    section: '395.3(b)',
    description: 'Driving beyond 60/70-hour limit',
    severity: 'critical',
    fixAction:
      'Driver must cease driving. Use 34-hour restart or accumulate enough off-duty time to drop below the cycle limit.',
    checkItem: 'Cumulative on-duty hours within 60/70-hour rolling window',
  },
  {
    code: '395.22(a)',
    group: 'HOS',
    section: '395.22(a)',
    description: 'ELD — operating without a registered/compliant ELD',
    severity: 'critical',
    fixAction:
      'Install an FMCSA-registered ELD. If exempt, carry supporting documentation. Verify device appears on FMCSA registered ELD list.',
    checkItem: 'ELD device present, powered, registered, and recording duty status',
  },
  {
    code: '395.22(b)',
    group: 'HOS',
    section: '395.22(b)',
    description: 'ELD — driver not trained on ELD use',
    severity: 'other',
    fixAction:
      'Provide driver with ELD user manual and hands-on training. Document training date and content in driver qualification file.',
    checkItem: 'Driver can demonstrate basic ELD operations and data transfer',
  },
  {
    code: '395.24(a)',
    group: 'HOS',
    section: '395.24(a)',
    description: 'ELD — driver unable to present RODS in acceptable format',
    severity: 'serious',
    fixAction:
      'Ensure ELD can produce electronic output (Bluetooth/USB) or print RODS on demand. Carry backup paper logs and graph grid.',
    checkItem: 'Driver can produce RODS electronically or on paper upon request',
  },
  {
    code: '395.8',
    group: 'HOS',
    section: '395.8',
    description: 'False or inaccurate record of duty status',
    severity: 'critical',
    fixAction:
      'Reconstruct accurate logs. Carrier must audit log data against GPS, fuel receipts, and dispatch records. Retrain driver on compliance.',
    checkItem: 'Record of duty status matches actual driving and duty times',
  },

  // =========================================================================
  // DRIVER FITNESS
  // =========================================================================
  {
    code: '391.41(a)',
    group: 'DRIVER_FITNESS',
    section: '391.41(a)',
    description: 'Operating a CMV without a valid medical certificate',
    severity: 'critical',
    fixAction:
      'Driver must obtain a current DOT physical from a listed medical examiner. Carry original or copy of medical card at all times.',
    checkItem: 'Valid medical examiner certificate on person and not expired',
  },
  {
    code: '391.11(a)',
    group: 'DRIVER_FITNESS',
    section: '391.11(a)',
    description: 'Unqualified driver — general qualification requirements not met',
    severity: 'critical',
    fixAction:
      'Review driver qualification file. Ensure driver meets age, language, license, medical, and road-test requirements before dispatch.',
    checkItem: 'Driver meets all Part 391 general qualifications',
  },
  {
    code: '391.45(a)',
    group: 'DRIVER_FITNESS',
    section: '391.45(a)',
    description: 'Operating a CMV without a valid medical certificate on file with employer',
    severity: 'serious',
    fixAction:
      'File a copy of the current medical certificate in the driver qualification file at the carrier office.',
    checkItem: 'Current medical certificate on file with the motor carrier',
  },
  {
    code: '391.45(b)(1)',
    group: 'DRIVER_FITNESS',
    section: '391.45(b)(1)',
    description: 'Expired medical examiner certificate',
    severity: 'critical',
    fixAction:
      'Schedule an immediate DOT physical renewal. Driver must not operate a CMV until a new certificate is issued.',
    checkItem: 'Medical certificate expiration date is in the future',
  },
  {
    code: '383.23(a)',
    group: 'DRIVER_FITNESS',
    section: '383.23(a)',
    description: 'Operating a CMV without a CDL',
    severity: 'critical',
    fixAction:
      'Driver must obtain a valid CDL of the correct class with required endorsements before operating the vehicle.',
    checkItem: 'Driver holds a valid CDL of correct class for the vehicle being operated',
  },
  {
    code: '383.23(a)(2)',
    group: 'DRIVER_FITNESS',
    section: '383.23(a)(2)',
    description: 'CDL — wrong class or missing required endorsement',
    severity: 'critical',
    fixAction:
      'Driver must upgrade CDL class or add the missing endorsement (H, N, T, P, S, X) at the state DMV before operating.',
    checkItem: 'CDL class and endorsements match vehicle type and cargo',
  },
  {
    code: '383.37(a)',
    group: 'DRIVER_FITNESS',
    section: '383.37(a)',
    description: 'Allowing or requiring a disqualified driver to operate a CMV',
    severity: 'critical',
    fixAction:
      'Remove driver from service immediately. Verify driving record through CDLIS before re-assigning any CMV duties.',
    checkItem: 'Driver not disqualified, suspended, or revoked per CDLIS check',
  },
  {
    code: '391.51(a)',
    group: 'DRIVER_FITNESS',
    section: '391.51(a)',
    description: 'Failing to maintain a driver qualification file',
    severity: 'other',
    fixAction:
      'Create and maintain DQ files for all drivers with required documents: application, MVR, medical cert, road test, annual review.',
    checkItem: 'Complete driver qualification file on record at carrier office',
  },
  {
    code: '382.115(a)',
    group: 'DRIVER_FITNESS',
    section: '382.115(a)',
    description: 'Controlled substances / alcohol — no compliant testing program',
    severity: 'serious',
    fixAction:
      'Enroll in a DOT-compliant drug and alcohol testing consortium. Conduct pre-employment, random, and post-accident testing per Part 382.',
    checkItem: 'Carrier has an active DOT drug & alcohol testing program',
  },

  // =========================================================================
  // CARGO SECUREMENT
  // =========================================================================
  {
    code: '393.100(a)',
    group: 'CARGO_SECUREMENT',
    section: '393.100(a)',
    description: 'Failure to prevent cargo shifting — general securement requirement',
    severity: 'critical',
    fixAction:
      'Add tiedowns, blocking, or bracing to prevent the cargo from shifting in any direction. Re-tension all existing tiedowns.',
    checkItem: 'Cargo does not shift, leak, spill, blow off, or fall from the vehicle',
  },
  {
    code: '393.100(b)',
    group: 'CARGO_SECUREMENT',
    section: '393.100(b)',
    description: 'Failure to secure cargo against movement in all directions',
    severity: 'critical',
    fixAction:
      'Assess forward, rearward, lateral, and vertical restraint. Add tiedowns or increase aggregate working load limit to meet requirements.',
    checkItem: 'Cargo secured against forward, rearward, lateral, and vertical movement',
  },
  {
    code: '393.104(b)',
    group: 'CARGO_SECUREMENT',
    section: '393.104(b)',
    description: 'Damaged or defective tiedown — not fit for securement',
    severity: 'serious',
    fixAction:
      'Replace any chain, strap, wire rope, or binder that is knotted, cut, abraded, or has a damaged fitting. Use only rated devices.',
    checkItem: 'All tiedowns in serviceable condition with no knots, cuts, or damaged fittings',
  },
  {
    code: '393.104(f)',
    group: 'CARGO_SECUREMENT',
    section: '393.104(f)',
    description: 'Insufficient number/strength of tiedowns for load',
    severity: 'critical',
    fixAction:
      'Calculate aggregate working load limit needed (at least 50% of cargo weight). Add tiedowns until the requirement is met.',
    checkItem:
      'Aggregate working load limit of tiedowns equals or exceeds 50% of cargo weight',
  },
  {
    code: '393.106(b)',
    group: 'CARGO_SECUREMENT',
    section: '393.106(b)',
    description: 'Cargo not immobilized or secured on/within the vehicle',
    severity: 'serious',
    fixAction:
      'Position cargo against front-end structure or use blocking. Apply additional tiedowns to achieve immobilization in transit.',
    checkItem: 'Cargo immobilized by vehicle structure, blocking, bracing, or tiedowns',
  },
  {
    code: '393.106(d)',
    group: 'CARGO_SECUREMENT',
    section: '393.106(d)',
    description: 'Failure to re-check cargo securement after first 50 miles',
    severity: 'other',
    fixAction:
      'Stop within the first 50 miles and re-inspect all securement. Re-tension straps, tighten binders, and adjust as needed.',
    checkItem: 'Cargo securement inspected and adjusted within first 50 miles of trip',
  },
  {
    code: '393.110(b)',
    group: 'CARGO_SECUREMENT',
    section: '393.110(b)',
    description: 'Minimum number of tiedowns not met for article length',
    severity: 'serious',
    fixAction:
      'Add tiedowns per rule: 1 for articles 5 ft or less; 2 for 5-10 ft; plus 1 for every additional 10 ft. Distribute evenly.',
    checkItem: 'Number of tiedowns meets minimum requirement for each article length',
  },

  // =========================================================================
  // HAZMAT
  // =========================================================================
  {
    code: '172.800(a)',
    group: 'HAZMAT',
    section: '172.800(a)',
    description: 'No hazmat security plan when required',
    severity: 'serious',
    fixAction:
      'Develop a written security plan addressing personnel security, unauthorized access, and en-route security. Train all hazmat employees.',
    checkItem: 'Written hazmat security plan on file and current',
  },
  {
    code: '172.704(a)',
    group: 'HAZMAT',
    section: '172.704(a)',
    description: 'Hazmat employee not trained or certified as required',
    severity: 'serious',
    fixAction:
      'Complete general awareness, function-specific, safety, and security training. Issue certificate and retain records for 3 years.',
    checkItem: 'Hazmat employee training records current and on file',
  },
  {
    code: '173.24(b)',
    group: 'HAZMAT',
    section: '173.24(b)',
    description: 'Packaging not adequate — leaking or damaged container',
    severity: 'critical',
    fixAction:
      'Remove leaking container from vehicle. Transfer contents to a compliant package. Decontaminate vehicle if needed.',
    checkItem: 'All hazmat packaging secure, sealed, and free of leaks',
  },
  {
    code: '172.200(a)',
    group: 'HAZMAT',
    section: '172.200(a)',
    description: 'No shipping papers or papers not accessible',
    severity: 'critical',
    fixAction:
      'Prepare proper shipping papers with correct description, quantity, and emergency contact. Keep within driver reach or in door pocket.',
    checkItem: 'Hazmat shipping papers present, accurate, and within immediate reach',
  },
  {
    code: '172.504(a)',
    group: 'HAZMAT',
    section: '172.504(a)',
    description: 'Placards not displayed as required',
    severity: 'critical',
    fixAction:
      'Display correct placards on all four sides of the vehicle. Placards must match shipping paper hazard class. Use DANGEROUS placard if appropriate.',
    checkItem: 'Correct placards displayed on front, rear, and both sides',
  },
  {
    code: '397.1',
    group: 'HAZMAT',
    section: '397.1',
    description: 'Hazmat — driving/parking rules for Division 1.1/1.2/1.3 explosives violations',
    severity: 'critical',
    fixAction:
      'Review and follow all Part 397 routing and parking requirements. Do not park within 5 feet of traveled portion of road. Attend vehicle at all times.',
    checkItem: 'Vehicle compliant with hazmat driving and parking requirements',
  },
  {
    code: '397.7(a)',
    group: 'HAZMAT',
    section: '397.7(a)',
    description: 'Hazmat vehicle parked — not attended and not on safe parking location',
    severity: 'serious',
    fixAction:
      'Move vehicle to a safe location (carrier property, designated lot). If parking is unavoidable, ensure vehicle is attended or on a safe haven.',
    checkItem: 'Hazmat vehicle parked in approved location or attended at all times',
  },
  {
    code: '177.817(a)',
    group: 'HAZMAT',
    section: '177.817(a)',
    description: 'Shipping papers — hazmat description incorrect or incomplete',
    severity: 'serious',
    fixAction:
      'Correct shipping papers to include proper shipping name, hazard class, ID number, packing group, and quantity. List emergency contact.',
    checkItem: 'Hazmat shipping paper entries match contents and include all required fields',
  },

  // =========================================================================
  // VEHICLE MAINTENANCE
  // =========================================================================
  {
    code: '396.3(a)(1)',
    group: 'VEHICLE_MAINTENANCE',
    section: '396.3(a)(1)',
    description: 'Parts and accessories not in safe and proper operating condition',
    severity: 'serious',
    fixAction:
      'Conduct full vehicle inspection. Repair all defective components identified. Document repairs with date, description, and technician.',
    checkItem: 'All parts and accessories in safe and proper operating condition',
  },
  {
    code: '396.7(a)',
    group: 'VEHICLE_MAINTENANCE',
    section: '396.7(a)',
    description: 'Carrier failing to systematically inspect, repair, and maintain vehicles',
    severity: 'serious',
    fixAction:
      'Establish or improve a written preventive maintenance program. Schedule periodic inspections and document every repair.',
    checkItem: 'Written PM program in place with documented inspection intervals',
  },
  {
    code: '396.11(a)',
    group: 'VEHICLE_MAINTENANCE',
    section: '396.11(a)',
    description: 'Driver vehicle inspection report (DVIR) not prepared',
    severity: 'serious',
    fixAction:
      'Driver must complete a written DVIR at the end of each driving day covering all Part 396 items. Carrier must retain for 3 months.',
    checkItem: 'DVIR completed for each vehicle operated at end of day',
  },
  {
    code: '396.13(a)',
    group: 'VEHICLE_MAINTENANCE',
    section: '396.13(a)',
    description:
      'Driver operating without reviewing previous DVIR or signing acknowledgment',
    severity: 'serious',
    fixAction:
      'Before driving, review the last DVIR. If defects were noted, verify repairs were made. Sign the report before departure.',
    checkItem: 'Prior DVIR reviewed and signed before vehicle departure',
  },
  {
    code: '396.13(c)',
    group: 'VEHICLE_MAINTENANCE',
    section: '396.13(c)',
    description: 'No certification of repairs on DVIR',
    severity: 'other',
    fixAction:
      'Mechanic or carrier must certify on the DVIR that all reported defects have been repaired or that no repair is needed.',
    checkItem: 'DVIR repair certification signed by carrier representative',
  },
  {
    code: '396.17(a)',
    group: 'VEHICLE_MAINTENANCE',
    section: '396.17(a)',
    description: 'No periodic (annual) inspection on file',
    severity: 'critical',
    fixAction:
      'Have a qualified inspector perform a full Part 396 Appendix G inspection. Affix current inspection decal and retain report for 14 months.',
    checkItem: 'Current annual inspection decal displayed and report on file',
  },
  {
    code: '396.17(c)',
    group: 'VEHICLE_MAINTENANCE',
    section: '396.17(c)',
    description: 'Operating with an expired annual inspection',
    severity: 'critical',
    fixAction:
      'Schedule immediate re-inspection. Do not operate the vehicle until inspection is complete and decal is affixed.',
    checkItem: 'Annual inspection is within 12 months of the date on decal',
  },

  // =========================================================================
  // SUSPENSION
  // =========================================================================
  {
    code: '393.207(a)',
    group: 'SUSPENSION',
    section: '393.207(a)',
    description: 'Suspension — axle positioning parts defective or missing',
    severity: 'critical',
    fixAction:
      'Inspect torque rods, radius rods, and trailing arms. Replace any part that is cracked, broken, or missing. Check bushing condition.',
    checkItem: 'All axle positioning parts (torque rods, trailing arms) intact and secure',
  },
  {
    code: '393.207(b)',
    group: 'SUSPENSION',
    section: '393.207(b)',
    description: 'Suspension — leaf spring assembly defective',
    severity: 'critical',
    fixAction:
      'Replace broken or shifted main leaf. If 25% or more of leaves are broken, replace the entire spring pack. Verify U-bolt torque.',
    checkItem:
      'Leaf spring packs complete with no broken/shifted main leaf and fewer than 25% broken leaves',
  },
  {
    code: '393.207(c)',
    group: 'SUSPENSION',
    section: '393.207(c)',
    description: 'Suspension — U-bolt(s) or other axle positioning hardware cracked, broken, loose, or missing',
    severity: 'critical',
    fixAction:
      'Replace broken or missing U-bolts. Torque all U-bolts and spring mounting hardware to spec. Inspect spring seats.',
    checkItem: 'All U-bolts, spring pins, and mounting hardware tight and intact',
  },
  {
    code: '393.207(d)',
    group: 'SUSPENSION',
    section: '393.207(d)',
    description: 'Air suspension — deflated or leaking air bag',
    severity: 'critical',
    fixAction:
      'Replace leaking air spring. Check height control valve and airlines. Verify ride height is level and within spec at all corners.',
    checkItem: 'Air springs fully inflated with no leaks; ride height level',
  },

  // =========================================================================
  // STEERING
  // =========================================================================
  {
    code: '393.209(a)',
    group: 'STEERING',
    section: '393.209(a)',
    description: 'Steering system — excessive lash or free play',
    severity: 'critical',
    fixAction:
      'Measure steering wheel free play per FMCSA table (varies by wheel diameter). Replace worn gear box, pitman arm, drag link, or tie rod ends as needed.',
    checkItem: 'Steering wheel free play within FMCSA limits for wheel diameter',
  },
  {
    code: '393.209(b)',
    group: 'STEERING',
    section: '393.209(b)',
    description: 'Steering column — loose or worn universal joint or coupler',
    severity: 'critical',
    fixAction:
      'Replace worn steering column U-joints or rag joint. Torque clamp bolts to spec. Verify no play or binding through full lock.',
    checkItem: 'Steering column secure with no play in U-joints or coupler',
  },
  {
    code: '393.209(d)',
    group: 'STEERING',
    section: '393.209(d)',
    description: 'Power steering — fluid leak or inoperative assist',
    severity: 'serious',
    fixAction:
      'Repair or replace leaking hoses, pump, or gear. Refill fluid to proper level. Confirm assist is smooth through full range of travel.',
    checkItem: 'Power steering operational with no fluid leaks',
  },

  // =========================================================================
  // EXHAUST
  // =========================================================================
  {
    code: '393.83(a)',
    group: 'EXHAUST',
    section: '393.83(a)',
    description: 'Exhaust system — leak or discharge under cab or sleeper',
    severity: 'critical',
    fixAction:
      'Locate and repair exhaust leak. Replace damaged pipe, clamp, or gasket. Ensure all discharge exits behind the cab or to the side away from passengers.',
    checkItem: 'No exhaust leaks forward of or beneath the cab/sleeper',
  },
  {
    code: '393.83(c)',
    group: 'EXHAUST',
    section: '393.83(c)',
    description: 'Exhaust system — not securely fastened',
    severity: 'other',
    fixAction:
      'Reinstall or replace missing exhaust brackets, hangers, and clamps. Verify the system is rigid and does not contact wiring or fuel lines.',
    checkItem: 'Exhaust system securely mounted with all hangers and clamps intact',
  },
  {
    code: '393.83(e)',
    group: 'EXHAUST',
    section: '393.83(e)',
    description: 'Exhaust system — excessive exhaust leak',
    severity: 'serious',
    fixAction:
      'Repair or replace leaking manifold gasket, flex pipe, DPF clamp, or cracked pipe section. Re-test for leaks at operating temperature.',
    checkItem: 'No visible or audible exhaust leaks at any joint or component',
  },

  // =========================================================================
  // FUEL SYSTEM
  // =========================================================================
  {
    code: '393.65(a)',
    group: 'FUEL_SYSTEM',
    section: '393.65(a)',
    description: 'Fuel system — fuel leaking from any component',
    severity: 'critical',
    fixAction:
      'Locate and stop the leak. Replace faulty fuel line, fitting, filter, or injector. Clean any spilled fuel and verify no drip at idle.',
    checkItem: 'No fuel leaks from tank, lines, filters, or fittings',
  },
  {
    code: '393.67(a)',
    group: 'FUEL_SYSTEM',
    section: '393.67(a)',
    description: 'Fuel tank — not securely attached or mounting loose',
    severity: 'serious',
    fixAction:
      'Tighten or replace fuel tank mounting straps and brackets. Inspect rubber isolators. Verify tank does not shift under braking or cornering.',
    checkItem: 'Fuel tank securely mounted with tight straps and no movement',
  },
  {
    code: '393.67(c)(8)',
    group: 'FUEL_SYSTEM',
    section: '393.67(c)(8)',
    description: 'Fuel tank cap missing or not sealing',
    severity: 'other',
    fixAction:
      'Replace missing or damaged fuel cap with correct OEM-spec cap that seals properly. Verify no fuel odor after replacement.',
    checkItem: 'Fuel tank cap present and sealing correctly',
  },

  // =========================================================================
  // COUPLING DEVICES
  // =========================================================================
  {
    code: '393.70(a)',
    group: 'COUPLING',
    section: '393.70(a)',
    description: 'Fifth wheel — not securely mounted to frame',
    severity: 'critical',
    fixAction:
      'Inspect all fifth-wheel mounting bolts. Replace any missing, loose, or damaged fasteners. Verify mounting brackets and slide mechanism integrity.',
    checkItem: 'Fifth wheel securely bolted to frame with no loose or missing fasteners',
  },
  {
    code: '393.70(b)',
    group: 'COUPLING',
    section: '393.70(b)',
    description: 'Fifth wheel — locking mechanism defective or not engaged',
    severity: 'critical',
    fixAction:
      'Repair or replace worn locking jaws, operating handle, or release mechanism. Perform tug test to verify lock engagement after coupling.',
    checkItem: 'Fifth wheel locking jaws fully engaged around kingpin; tug test passed',
  },
  {
    code: '393.70(d)',
    group: 'COUPLING',
    section: '393.70(d)',
    description: 'Upper coupler (trailer kingpin) — worn or damaged',
    severity: 'critical',
    fixAction:
      'Measure kingpin diameter. Replace if worn below minimum (typically 2.84 in for 2-inch pin). Inspect upper coupler plate for cracks.',
    checkItem: 'Kingpin within wear limits and upper coupler plate free of cracks',
  },
  {
    code: '393.71(a)',
    group: 'COUPLING',
    section: '393.71(a)',
    description: 'Drawbar/tongue — cracked, broken, or improperly secured',
    severity: 'critical',
    fixAction:
      'Replace cracked or bent drawbar. Verify all mounting hardware is torqued. Inspect pintle eye for elongation.',
    checkItem: 'Drawbar and tongue free of cracks and securely attached',
  },
  {
    code: '393.71(h)',
    group: 'COUPLING',
    section: '393.71(h)',
    description: 'Safety chains/cables — missing, broken, or improperly attached',
    severity: 'critical',
    fixAction:
      'Install or replace safety chains of adequate rating. Cross chains under tongue. Verify both chains connect frame to frame independently of drawbar.',
    checkItem: 'Safety chains present, crossed, and properly connected on both sides',
  },

  // =========================================================================
  // FRAME
  // =========================================================================
  {
    code: '393.201(a)',
    group: 'FRAME',
    section: '393.201(a)',
    description: 'Frame — cracked, loose, sagging, or broken rail or member',
    severity: 'critical',
    fixAction:
      'Weld-repair or replace cracked frame rail per manufacturer guidelines. Verify cross-member fasteners are tight. Re-align if sagging.',
    checkItem: 'Frame rails and cross members free of cracks, breaks, and sag',
  },
  {
    code: '393.201(b)',
    group: 'FRAME',
    section: '393.201(b)',
    description: 'Frame — bolts or fasteners missing or ineffective',
    severity: 'serious',
    fixAction:
      'Replace all missing or loose frame bolts/rivets. Use correct grade hardware. Torque to spec and recheck after 500 miles.',
    checkItem: 'All frame fasteners present, tight, and correct grade',
  },
  {
    code: '393.203(a)',
    group: 'FRAME',
    section: '393.203(a)',
    description: 'Cab or body — not securely fastened to frame',
    severity: 'serious',
    fixAction:
      'Inspect cab/body mounting bolts and bushings. Tighten or replace any loose or deteriorated mounts. Check for cracked brackets.',
    checkItem: 'Cab and body securely mounted to frame with no loose or missing bolts',
  },

  // =========================================================================
  // WINDSHIELD & GLASS
  // =========================================================================
  {
    code: '393.60(a)',
    group: 'WINDSHIELD_GLASS',
    section: '393.60(a)',
    description: 'Glazing — required window or windshield missing or not safety glass',
    severity: 'serious',
    fixAction:
      'Replace missing or non-safety glass windows. Use AS-1 or AS-2 marked glass. Verify proper seal and retention.',
    checkItem: 'All required windows present with proper AS-marked safety glass',
  },
  {
    code: '393.60(b)',
    group: 'WINDSHIELD_GLASS',
    section: '393.60(b)',
    description: 'Windshield — cracked, discolored, or obstructed in driver view area',
    severity: 'serious',
    fixAction:
      'Replace windshield if cracks, chips, or discoloration are in the swept area. Remove stickers or objects obstructing view.',
    checkItem: 'Windshield clear and unobstructed in the area swept by wipers',
  },
  {
    code: '393.60(e)(1)',
    group: 'WINDSHIELD_GLASS',
    section: '393.60(e)(1)',
    description: 'Unauthorized stickers, decals, or sun screening in driver view area',
    severity: 'other',
    fixAction:
      'Remove all non-DOT stickers and tinting from the windshield sweep area. Only inspection stickers and legally required decals may remain.',
    checkItem: 'No unauthorized stickers or sun screening in windshield driver view area',
  },
  {
    code: '393.78',
    group: 'WINDSHIELD_GLASS',
    section: '393.78',
    description: 'Windshield wipers inoperative or missing',
    severity: 'serious',
    fixAction:
      'Replace wiper blades, motor, or linkage as needed. Test on all speeds. Verify wipers clear at least one full sweep of windshield.',
    checkItem: 'Windshield wipers operative on all speeds and blades in good condition',
  },

  // =========================================================================
  // GENERAL VEHICLE
  // =========================================================================
  {
    code: '393.86(a)',
    group: 'GENERAL',
    section: '393.86(a)',
    description: 'Rear impact guard (underride protection) missing or defective',
    severity: 'critical',
    fixAction:
      'Install or repair rear impact guard meeting 49 CFR 393.86 / FMVSS 223. Guard must extend within 22 in of ground and 18 in of each side.',
    checkItem: 'Rear impact guard present, properly mounted, and within dimensional requirements',
  },
  {
    code: '393.86(b)',
    group: 'GENERAL',
    section: '393.86(b)',
    description: 'Rear impact guard — does not meet dimensional/strength requirements',
    severity: 'serious',
    fixAction:
      'Adjust or replace guard to meet height (max 22 in from ground), width (within 18 in of side), and strength specifications.',
    checkItem: 'Rear impact guard height and width within FMCSA dimensional limits',
  },
  {
    code: '393.95(a)',
    group: 'GENERAL',
    section: '393.95(a)',
    description: 'No or insufficient emergency equipment — fire extinguisher',
    severity: 'serious',
    fixAction:
      'Mount a fully charged, properly rated (5 B:C minimum) fire extinguisher in a bracket accessible to the driver. Check gauge monthly.',
    checkItem: 'Charged fire extinguisher mounted and accessible in cab',
  },
  {
    code: '393.95(b)',
    group: 'GENERAL',
    section: '393.95(b)',
    description: 'No or insufficient warning devices (triangles/flares)',
    severity: 'other',
    fixAction:
      'Place three reflective warning triangles in the vehicle. Ensure they are readily accessible for roadside use.',
    checkItem: 'Three reflective warning triangles present in cab or accessible compartment',
  },
  {
    code: '393.87',
    group: 'GENERAL',
    section: '393.87',
    description: 'No or defective horn',
    severity: 'other',
    fixAction:
      'Test horn for audible sound at 200 feet. Replace horn, relay, or wiring as needed.',
    checkItem: 'Horn sounds and is audible at reasonable distance',
  },
  {
    code: '393.80(a)',
    group: 'GENERAL',
    section: '393.80(a)',
    description: 'No or defective rear-view mirrors (both sides required)',
    severity: 'serious',
    fixAction:
      'Install or replace mirrors on both sides. Adjust for full rear visibility. Tighten mounting hardware to prevent vibration-induced drift.',
    checkItem: 'Two rear-view mirrors present, properly mounted, and adjusted for clear rear view',
  },
  {
    code: '393.76(a)',
    group: 'GENERAL',
    section: '393.76(a)',
    description: 'No or inadequate splash guards (mud flaps)',
    severity: 'other',
    fixAction:
      'Install or replace mud flaps on all rear-most axles. Flaps must extend to within prescribed distance of road surface.',
    checkItem: 'Mud flaps present on rear-most axle and extending to proper height',
  },
  {
    code: '393.90',
    group: 'GENERAL',
    section: '393.90',
    description: 'No or defective defroster/defogger',
    severity: 'other',
    fixAction:
      'Repair HVAC blower, heater core, or ducting. Verify defroster clears windshield within a reasonable time at idle.',
    checkItem: 'Defroster/defogger operative and capable of clearing windshield',
  },
  {
    code: '393.93(a)',
    group: 'GENERAL',
    section: '393.93(a)',
    description: 'No or defective seat belt in driver position',
    severity: 'serious',
    fixAction:
      'Replace seat belt assembly. Verify webbing retracts, latches securely, and anchor bolt is tight.',
    checkItem: 'Driver seat belt present, functional, and securely anchored',
  },

  // =========================================================================
  // Additional frequently-cited violations
  // =========================================================================

  // Brakes (additional)
  {
    code: '393.45(b)(2)',
    group: 'BRAKES',
    section: '393.45(b)(2)',
    description: 'Brake hose/tubing — metal-to-metal contact or improper support',
    severity: 'other',
    fixAction:
      'Re-route and clamp brake lines to eliminate metal-to-metal contact. Add protective grommets where lines pass through frame.',
    checkItem: 'Brake tubing properly supported and free of metal-on-metal wear points',
  },
  {
    code: '393.48(b)',
    group: 'BRAKES',
    section: '393.48(b)',
    description: 'Inoperative or missing ABS on trailer',
    severity: 'serious',
    fixAction:
      'Verify ABS lamp on left rear of trailer illuminates briefly at power-up then goes off. Repair faulty sensors, modulators, or wiring.',
    checkItem: 'Trailer ABS malfunction lamp cycles off within seconds of power-up',
  },

  // Lighting (additional)
  {
    code: '393.9(a)(1)',
    group: 'LIGHTING',
    section: '393.9(a)(1)',
    description: 'Inoperative headlamp (one or both)',
    severity: 'serious',
    fixAction:
      'Replace headlamp bulb or repair wiring. Check aim per manufacturer specs. Verify both high-beam and low-beam function.',
    checkItem: 'Both headlamps operational on high and low beam',
  },
  {
    code: '393.11(b)',
    group: 'LIGHTING',
    section: '393.11(b)',
    description: 'No or inoperative license plate lamp',
    severity: 'other',
    fixAction:
      'Replace bulb or repair ground connection for rear license plate lamp. Plate must be illuminated by white light.',
    checkItem: 'License plate lamp illuminates rear plate',
  },

  // Tires (additional)
  {
    code: '393.75(b)',
    group: 'TIRES_WHEELS',
    section: '393.75(b)',
    description: 'Tire — audibly leaking or has noticeable bump/bulge',
    severity: 'serious',
    fixAction:
      'Locate leak with soap solution. Repair or replace tire. Any tire with a bulge must be removed from service immediately.',
    checkItem: 'Tires properly inflated with no audible leaks, bumps, or bulges',
  },
  {
    code: '393.75(f)',
    group: 'TIRES_WHEELS',
    section: '393.75(f)',
    description: 'Tire — mixed bias and radial on same axle',
    severity: 'other',
    fixAction:
      'Replace one of the mismatched tires so both tires on the axle are the same construction (all radial or all bias).',
    checkItem: 'Tires on each axle are the same construction type (radial or bias)',
  },

  // HOS (additional)
  {
    code: '395.3(a)(3)(ii)',
    group: 'HOS',
    section: '395.3(a)(3)(ii)',
    description: 'Driving after 8 hours without a 30-minute break',
    severity: 'serious',
    fixAction:
      'Driver must take a 30-minute off-duty or sleeper-berth break before the end of the 8th hour of driving.',
    checkItem: 'A 30-minute break logged before 8 cumulative hours of driving',
  },

  // Vehicle Maintenance (additional)
  {
    code: '396.3(b)',
    group: 'VEHICLE_MAINTENANCE',
    section: '396.3(b)',
    description: 'Carrier — push-out window/emergency exit inoperative (bus)',
    severity: 'serious',
    fixAction:
      'Repair or replace emergency exit windows, hatches, or doors. Verify all exits can be opened from inside and outside.',
    checkItem: 'All emergency exits functional and properly marked',
  },
  {
    code: '396.5(a)',
    group: 'VEHICLE_MAINTENANCE',
    section: '396.5(a)',
    description: 'Oil and/or grease leak — dripping on any part of the vehicle',
    severity: 'other',
    fixAction:
      'Identify and repair source of oil or grease leak. Clean affected surfaces. Re-check after engine run-up.',
    checkItem: 'No active oil or grease drips on vehicle underside or components',
  },
  {
    code: '396.9(c)(2)',
    group: 'VEHICLE_MAINTENANCE',
    section: '396.9(c)(2)',
    description: 'Failing to make required repairs before operating an OOS vehicle',
    severity: 'critical',
    fixAction:
      'Do not move the vehicle until all OOS conditions are repaired and documented. Present repair documentation to enforcement upon request.',
    checkItem: 'All prior out-of-service conditions fully repaired and documented',
  },
];

// ---------------------------------------------------------------------------
// Build the lookup map
// ---------------------------------------------------------------------------

export const VIOLATION_CODES: Map<string, ViolationCodeInfo> = new Map(
  entries.map((entry) => [entry.code, entry]),
);

// ---------------------------------------------------------------------------
// Helper functions
// ---------------------------------------------------------------------------

/**
 * Look up detailed information for a violation code.
 * Returns `null` if the code is not in the reference table.
 */
export function getViolationInfo(code: string): ViolationCodeInfo | null {
  return VIOLATION_CODES.get(code) ?? null;
}

/**
 * Return the human-readable display name for a violation group.
 */
export function getGroupDisplayName(group: ViolationGroup): string {
  return VIOLATION_GROUPS[group]?.displayName ?? group;
}

/**
 * Categorize a violation code into its group.
 * Falls back to `'OTHER'` if the code is not in the reference table.
 */
export function categorizeViolation(code: string): ViolationGroup {
  const info = VIOLATION_CODES.get(code);
  if (info) return info.group;

  // Heuristic fallback based on CFR section prefix
  const prefix = code.split('.')[0];
  switch (prefix) {
    case '393': {
      const section = parseFloat(code.replace(/[^0-9.]/g, ''));
      if (section >= 40 && section < 55) return 'BRAKES';
      if (section >= 9 && section < 30) return 'LIGHTING';
      if (section >= 75 && section < 76) return 'TIRES_WHEELS';
      if (section >= 100 && section < 130) return 'CARGO_SECUREMENT';
      if (section >= 60 && section < 63) return 'WINDSHIELD_GLASS';
      if (section >= 65 && section < 70) return 'FUEL_SYSTEM';
      if (section >= 70 && section < 72) return 'COUPLING';
      if (section >= 80 && section < 84) return 'GENERAL';
      if (section >= 83 && section < 84) return 'EXHAUST';
      if (section >= 86 && section < 87) return 'GENERAL';
      if (section >= 201 && section < 202) return 'FRAME';
      if (section >= 203 && section < 204) return 'FRAME';
      if (section >= 205 && section < 206) return 'TIRES_WHEELS';
      if (section >= 207 && section < 208) return 'SUSPENSION';
      if (section >= 209 && section < 210) return 'STEERING';
      return 'GENERAL';
    }
    case '395':
      return 'HOS';
    case '396':
      return 'VEHICLE_MAINTENANCE';
    case '391':
    case '383':
    case '382':
      return 'DRIVER_FITNESS';
    case '397':
    case '172':
    case '173':
    case '177':
      return 'HAZMAT';
    default:
      return 'OTHER';
  }
}
