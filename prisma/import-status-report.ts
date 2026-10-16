/**
 * Import a clearing & forwarding status report (converted by scripts/excel_to_json.py)
 * into Customers → Shipments (one per File Number) → ShipmentContainers + TrackingEvents.
 *
 *   npm run db:import -- prisma/data/mowara-status-2026-09-08.json
 *
 * Idempotent: re-running updates existing files (matched by File Number / container number)
 * and rebuilds their tracking timeline. It never touches users, roles or finance data.
 */
import { readFileSync } from 'node:fs';
import { PrismaClient, type ShipmentStatus, type CustomsStatus, type TransportMode } from '@prisma/client';

const prisma = new PrismaClient();

interface Unit {
  sheet: string;
  row: number;
  offloaded: boolean;
  fileNumber: string;
  client: string;
  containerNumber: string | null;
  containerNote: string | null;
  billOfLading: string | null;
  line: string | null;
  unitType: string | null;
  mode: 'SEA' | 'AIR';
  docsReceived: string | null;
  etaPort: string | null;
  discharge: string | null;
  truck: string | null;
  loadedOut: string | null;
  etaBorder: string | null;
  etaDestination: string | null;
  pendingDocs: string | null;
  remarks: string | null;
  events: { date: string | null; text: string }[];
}

const d = (s: string | null | undefined) => (s ? new Date(`${s}T00:00:00.000Z`) : null);

/** Normalise carrier spellings found in the sheet ("MESSINA", "Akkon Lines", "Quatar"...). */
function normaliseLine(raw: string | null): string | null {
  if (!raw) return null;
  const l = raw.toLowerCase();
  if (l.includes('messina')) return 'Messina Line';
  if (l.includes('akkon')) return 'Akkon Lines';
  if (l.includes('msc')) return 'MSC';
  if (l.startsWith('cma')) return 'CMA CGM';
  if (l.includes('wec')) return 'WEC Lines';
  if (l.includes('nmt')) return 'NMT Lines';
  if (l.includes('inchcape')) return 'Inchcape Shipping';
  if (l.includes('dhl')) return raw.includes('/') ? 'DHL Global / Qatar Airways' : 'DHL Global';
  if (l.includes('qatar') || l.includes('quatar')) return 'Qatar Airways';
  if (l.includes('ethiopian')) return 'Ethiopian Airlines';
  if (l.includes('turkish')) return 'Turkish Airlines';
  if (l.includes('emirates')) return 'Emirates';
  return raw.trim();
}

/** Derive the operational status of one unit from its dates + latest remark. */
function unitStatus(u: Unit): ShipmentStatus {
  const last = (u.events.at(-1)?.text ?? '').toLowerCase();
  if (u.offloaded || /offload|delivered/.test(last)) return 'DELIVERED';
  if (u.loadedOut || /truck at|enroute|en route|loaded/.test(last)) return 'IN_TRANSIT';
  if (u.discharge || /discharged|entry captured|customs|verification|release|\bdo\b|delivery order/.test(last))
    return 'CUSTOMS';
  if (u.docsReceived) return 'BOOKED';
  return 'DRAFT';
}

function customsStatus(u: Unit, status: ShipmentStatus): CustomsStatus {
  if (status === 'DELIVERED' || status === 'IN_TRANSIT') return 'CLEARED';
  if (status === 'CUSTOMS') return 'IN_CLEARANCE';
  return 'PENDING';
}

/** Lowest-progress unit decides the file status (a file is delivered only when ALL units are). */
const ORDER: ShipmentStatus[] = ['DRAFT', 'BOOKED', 'CUSTOMS', 'IN_TRANSIT', 'DELIVERED'];
const minStatus = (a: ShipmentStatus, b: ShipmentStatus) => (ORDER.indexOf(a) <= ORDER.indexOf(b) ? a : b);
const maxDate = (dates: (string | null)[]) => dates.filter(Boolean).sort().at(-1) ?? null;
const minDate = (dates: (string | null)[]) => dates.filter(Boolean).sort()[0] ?? null;

function locationOf(text: string): string | null {
  const m = text.match(/\b(?:at|to)\s+(Mombasa|Malaba|Lira|Nairobi|Entebbe|Nakuru|Mbale|Soroti|Kumi|Eldoret|Busia|Kampala|Bonje|Voi|Mariakani|Naivasha|Gilgil|Webuye|Bungoma|Machakos|Kibwezi|Emali|Mtito Andei|Makindu)\b/i);
  return m ? m[1].replace(/\b\w/g, (c) => c.toUpperCase()) : null;
}

async function main() {
  const file = process.argv[2] ?? 'prisma/data/mowara-status-2026-09-08.json';
  const { source, units } = JSON.parse(readFileSync(file, 'utf8')) as { source: string; units: Unit[] };
  console.log(`📥 Importing ${units.length} units from "${source}"`);

  const admin = await prisma.user.findFirst({
    where: { userRoles: { some: { role: { name: 'GENERAL_MANAGER' } } } },
    select: { id: true },
  });

  // ── Customers ───────────────────────────────────────────────
  const customerIds = new Map<string, string>();
  for (const name of [...new Set(units.map((u) => u.client))]) {
    const fileNumber = `KMT-C-${name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/(^-|-$)/g, '')}`;
    const c = await prisma.customer.upsert({
      where: { fileNumber },
      create: {
        fileNumber,
        type: 'COMPANY',
        legalName: name,
        country: 'Uganda',
        shippingAddress: 'Lira, Uganda',
        status: 'ACTIVE',
        notes: `Imported from ${source}`,
      },
      update: {},
    });
    customerIds.set(name, c.id);
  }
  console.log(`  ✓ ${customerIds.size} customers`);

  // ── Shipments (one per File Number) ─────────────────────────
  const byFile = new Map<string, Unit[]>();
  for (const u of units) byFile.set(u.fileNumber, [...(byFile.get(u.fileNumber) ?? []), u]);

  let containers = 0;
  let events = 0;
  for (const [fileNumber, group] of byFile) {
    const first = group[0];
    const statuses = group.map(unitStatus);
    const status = statuses.reduce(minStatus);
    const mode: TransportMode = first.mode;
    const lines = [...new Set(group.map((u) => normaliseLine(u.line)).filter(Boolean))] as string[];
    const bls = [...new Set(group.map((u) => u.billOfLading).filter(Boolean))] as string[];
    const containerNos = group.map((u) => u.containerNumber).filter(Boolean) as string[];
    const latestEvent = group
      .flatMap((u) => u.events)
      .filter((e) => e.date)
      .sort((a, b) => (a.date! < b.date! ? -1 : 1))
      .at(-1);
    const allDelivered = statuses.every((s) => s === 'DELIVERED');

    const data = {
      customerId: customerIds.get(first.client)!,
      mode,
      description: `${group.length} × ${[...new Set(group.map((u) => u.unitType).filter(Boolean))].join(', ') || 'cargo'} — ${first.client}`,
      cargoCategory: mode === 'AIR' ? 'Air cargo' : 'Containerised cargo',
      origin: mode === 'AIR' ? 'Entebbe Airport (EBB)' : 'Mombasa Port',
      destination: 'Lira',
      originCountry: mode === 'AIR' ? 'Uganda' : 'Kenya',
      destinationCountry: 'Uganda',
      departureDate: d(minDate(group.map((u) => u.loadedOut))),
      estimatedArrivalDate: d(maxDate(group.map((u) => u.etaDestination)) ?? maxDate(group.map((u) => u.etaPort))),
      actualDeliveryDate: allDelivered ? d(maxDate(group.map((u) => u.etaDestination ?? u.events.at(-1)?.date ?? null))) : null,
      carrier: lines.join(' / ') || null,
      containerNumber: containerNos.length === 1 ? containerNos[0] : containerNos.length ? `${containerNos.length} units` : null,
      billOfLading: mode === 'SEA' ? bls.join(', ') || null : null,
      airwayBill: mode === 'AIR' ? bls.join(', ') || null : null,
      packageCount: group.length,
      customsStatus: customsStatus(first, status),
      status,
      docsReceivedDate: d(minDate(group.map((u) => u.docsReceived))),
      pendingDocuments: [...new Set(group.map((u) => u.pendingDocs).filter(Boolean))].join('; ') || null,
      latestRemark: latestEvent ? `${latestEvent.date} — ${latestEvent.text}` : null,
      isOffloaded: group.every((u) => u.offloaded),
      importSource: `excel:${source}`,
      assignedEmployeeId: admin?.id ?? null,
    };

    const shipment = await prisma.shipment.upsert({
      where: { referenceNumber: fileNumber },
      create: { referenceNumber: fileNumber, ...data },
      update: data,
    });

    // Rebuild children for this file (idempotent re-import)
    await prisma.$transaction([
      prisma.shipmentContainer.deleteMany({ where: { shipmentId: shipment.id } }),
      prisma.trackingEvent.deleteMany({ where: { shipmentId: shipment.id, source: 'MANUAL', isVerified: true } }),
      prisma.shipmentStatusHistory.deleteMany({ where: { shipmentId: shipment.id } }),
    ]);

    await prisma.shipmentContainer.createMany({
      data: group.map((u, i) => ({
        shipmentId: shipment.id,
        containerNumber: u.containerNumber,
        unitType: [u.unitType, u.containerNote].filter(Boolean).join(' · ') || null,
        billOfLading: u.billOfLading,
        truckNumber: u.truck,
        dischargeDate: d(u.discharge),
        loadedOutDate: d(u.loadedOut),
        etaBorder: d(u.etaBorder),
        etaDestination: d(u.etaDestination),
        status: statuses[i],
        remarks: u.remarks,
        isOffloaded: u.offloaded,
      })),
    });
    containers += group.length;

    // Timeline: identical remark lines are shared between containers of the same file → de-duplicate.
    const seen = new Map<string, { date: string; text: string; units: string[] }>();
    for (const u of group) {
      for (const e of u.events) {
        if (!e.date) continue;
        const key = `${e.date}|${e.text.toLowerCase()}`;
        const ref = u.containerNumber ?? u.billOfLading ?? fileNumber;
        const hit = seen.get(key);
        if (hit) hit.units.push(ref);
        else seen.set(key, { date: e.date, text: e.text, units: [ref] });
      }
    }
    const timeline = [...seen.values()];
    await prisma.trackingEvent.createMany({
      data: timeline.map((e) => ({
        shipmentId: shipment.id,
        eventType: /offload|delivered/i.test(e.text)
          ? 'DELIVERED'
          : /truck at|enroute|en route|loaded/i.test(e.text)
            ? 'IN_TRANSIT'
            : /discharg/i.test(e.text)
              ? 'DISCHARGED'
              : /entry|customs|ura|kra|verification|release/i.test(e.text)
                ? 'CUSTOMS'
                : /\bdo\b|delivery order|bl\b|loa|telex|swb|document/i.test(e.text)
                  ? 'DOCUMENTATION'
                  : 'STATUS_UPDATE',
        location: locationOf(e.text),
        description: group.length > 1 && e.units.length < group.length ? `[${e.units.join(', ')}] ${e.text}` : e.text,
        source: 'MANUAL' as const,
        isVerified: true,
        occurredAt: d(e.date)!,
      })),
    });
    events += timeline.length;

    await prisma.shipmentStatusHistory.create({
      data: {
        shipmentId: shipment.id,
        fromStatus: null,
        toStatus: status,
        changedBy: admin?.id ?? null,
        changedAt: d(latestEvent?.date ?? null) ?? new Date(),
        notes: `Imported from ${source}`,
      },
    });
  }

  if (admin) {
    await prisma.auditLog.create({
      data: {
        userId: admin.id,
        action: 'IMPORT_STATUS_REPORT',
        module: 'SHIPMENTS',
        newValues: { source, files: byFile.size, units: containers, events },
      },
    });
  }

  console.log(`  ✓ ${byFile.size} shipment files, ${containers} containers/units, ${events} tracking events`);
}

main()
  .catch((e) => {
    console.error('❌', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
