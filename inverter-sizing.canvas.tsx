import {
  BarChart,
  Callout,
  Checkbox,
  Divider,
  Grid,
  H1,
  H2,
  H3,
  Pill,
  Row,
  Select,
  Stack,
  Stat,
  Table,
  Text,
  TextInput,
  useCanvasState,
  useHostTheme,
  useMemo,
} from "cursor/canvas";

type LoadId = "fridge" | "lights" | "cpap" | "o2" | "neb";

interface Load {
  id: LoadId;
  name: string;
  enabled: boolean;
  watts: number;
  surge: number;
  hours: number;
}

const DEFAULT_LOADS: Load[] = [
  {
    id: "fridge",
    name: "Refrigerator",
    enabled: true,
    watts: 180,
    surge: 1200,
    hours: 8,
  },
  {
    id: "lights",
    name: "LED lights",
    enabled: true,
    watts: 60,
    surge: 60,
    hours: 8,
  },
  {
    id: "cpap",
    name: "CPAP with humidifier",
    enabled: true,
    watts: 70,
    surge: 90,
    hours: 8,
  },
  {
    id: "o2",
    name: "Oxygen concentrator",
    enabled: false,
    watts: 350,
    surge: 400,
    hours: 24,
  },
  {
    id: "neb",
    name: "Nebulizer",
    enabled: false,
    watts: 80,
    surge: 100,
    hours: 1,
  },
];

const INVERTER_SIZES = [600, 1000, 1500, 2000, 3000, 4000, 5000, 6000, 8000];
const AH_SIZES = [50, 100, 150, 200, 280, 300, 400, 500, 600];
const FUSE_SIZES = [30, 40, 50, 60, 80, 100, 125, 150, 175, 200, 250, 300, 350, 400];
const EFF = 0.88;

const HOURS: Record<"overnight" | "day", Record<LoadId, number>> = {
  overnight: { fridge: 3, lights: 4, cpap: 8, o2: 8, neb: 0.5 },
  day: { fridge: 8, lights: 8, cpap: 8, o2: 24, neb: 1 },
};

function nextAtLeast(steps: number[], value: number): number {
  return steps.find((step) => step >= value) ?? Math.ceil(value / 100) * 100;
}

function clampNonNeg(value: string, fallback: number): number {
  if (value.trim() === "") return 0;
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return n;
}

function fmt(n: number, digits = 0): string {
  return n.toLocaleString("en-US", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function copperForFuse(fuse: number): string {
  if (fuse <= 15) return "14 AWG";
  if (fuse <= 20) return "12 AWG";
  if (fuse <= 30) return "10 AWG";
  if (fuse <= 40) return "8 AWG";
  if (fuse <= 60) return "6 AWG";
  if (fuse <= 80) return "4 AWG";
  if (fuse <= 100) return "2 AWG";
  return "1/0 AWG";
}

function awgForAmps(amps: number): string {
  const table: Array<[number, string]> = [
    [35, "10 AWG"],
    [50, "8 AWG"],
    [65, "6 AWG"],
    [85, "4 AWG"],
    [115, "2 AWG"],
    [130, "1 AWG"],
    [150, "1/0 AWG"],
    [175, "2/0 AWG"],
    [200, "3/0 AWG"],
    [230, "4/0 AWG"],
  ];
  const hit = table.find(([ampacity]) => ampacity >= amps);
  return hit ? hit[1] : "Parallel 4/0 or move to 48 V";
}

type Price = [number, number];

function usd(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function priceRange(range: Price): string {
  const [low, high] = range;
  if (low <= 0 && high <= 0) return "$0";
  if (low === high) return usd(low);
  return `${usd(low)}–${usd(high)}`;
}

function addPrice(a: Price, b: Price): Price {
  return [a[0] + b[0], a[1] + b[1]];
}

function inverterPrice(watts: number): Price {
  const table: Array<[number, number, number]> = [
    [600, 150, 350],
    [1000, 250, 650],
    [1500, 350, 850],
    [2000, 450, 1100],
    [3000, 700, 1600],
    [4000, 900, 2000],
    [5000, 1200, 2500],
    [6000, 1500, 3200],
    [8000, 2000, 4500],
  ];
  const hit = table.find(([size]) => size >= watts) ?? [watts, 2000, 4500];
  return [hit[1], hit[2]];
}

function batteryPrice(volts: number, ah: number, chemistry: string): Price {
  const kwh = (volts * ah) / 1000;
  const [perLow, perHigh] = chemistry === "lead" ? [120, 200] : [220, 450];
  return [Math.round(kwh * perLow), Math.round(kwh * perHigh)];
}

function fusePrice(amps: number): Price {
  if (amps <= 100) return [20, 45];
  if (amps <= 200) return [30, 70];
  return [45, 110];
}

function fuseHolderPrice(amps: number): Price {
  if (amps <= 200) return [45, 80];
  return [60, 110];
}

function switchPrice(amps: number): Price {
  if (amps <= 150) return [30, 65];
  if (amps <= 300) return [45, 100];
  return [80, 180];
}

function cablePrice(gauge: string, feet: number): Price {
  const perFoot: Record<string, Price> = {
    "14 AWG": [1, 2],
    "12 AWG": [1, 2],
    "10 AWG": [2, 3],
    "8 AWG": [2, 4],
    "6 AWG": [3, 5],
    "4 AWG": [4, 7],
    "2 AWG": [5, 9],
    "1 AWG": [6, 11],
    "1/0 AWG": [7, 13],
    "2/0 AWG": [9, 16],
    "3/0 AWG": [11, 18],
    "4/0 AWG": [12, 22],
  };
  if (!(gauge in perFoot)) return [80, 250];
  const [low, high] = perFoot[gauge];
  return [Math.max(8, Math.round(low * feet)), Math.max(12, Math.round(high * feet))];
}

function chargerPrice(amps: number, chemistry: string): Price {
  const base = chemistry === "lead" ? 50 : 70;
  const perAmp = chemistry === "lead" ? 3 : 5;
  const mid = base + amps * perAmp;
  return [Math.round(mid * 0.75), Math.round(mid * 1.35)];
}

function DiagramBox({
  x,
  y,
  w,
  h,
  title,
  detail,
  fill,
  stroke,
  titleColor,
  detailColor,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  title: string;
  detail: string;
  fill: string;
  stroke: string;
  titleColor: string;
  detailColor: string;
}) {
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={w}
        height={h}
        rx={6}
        fill={fill}
        stroke={stroke}
      />
      <text x={x + 12} y={y + 24} fill={titleColor} fontSize={13} fontWeight={600}>
        {title}
      </text>
      <text x={x + 12} y={y + 42} fill={detailColor} fontSize={11}>
        {detail}
      </text>
    </g>
  );
}

function WiringDiagram({
  volts,
  ah,
  fuseA,
  cable,
  inverterW,
  surgeW,
  chargerA,
  chargerFuse,
  chargerCable,
  chemLabel,
  loads,
}: {
  volts: number;
  ah: number;
  fuseA: number;
  cable: string;
  inverterW: number;
  surgeW: number;
  chargerA: number;
  chargerFuse: number;
  chargerCable: string;
  chemLabel: string;
  loads: Load[];
}) {
  const theme = useHostTheme();
  const fill = theme.fill.tertiary;
  const stroke = theme.stroke.primary;
  const title = theme.text.primary;
  const detail = theme.text.secondary;
  const pos = theme.category.red;
  const neg = theme.text.primary;
  const ground = theme.category.green;
  const ac = theme.category.blue;
  const box = {
    fill,
    stroke,
    titleColor: title,
    detailColor: detail,
  };
  const enabled = loads.filter((load) => load.enabled);
  const outlets =
    enabled.length > 0
      ? enabled.map((load) => ({
          id: load.id,
          name: load.name,
          detail: `${fmt(load.watts)} W running, own cord`,
        }))
      : [{ id: "none", name: "No load on", detail: "Switch a load on above" }];
  const outletW = (828 - 12 * (outlets.length - 1)) / outlets.length;

  return (
    <svg
      viewBox="0 0 860 548"
      width="100%"
      role="img"
      aria-label="Wiring diagram for the battery, fuse, inverter, charger, and 120 V outlets"
    >
      <text x={16} y={18} fill={detail} fontSize={11}>
        Standalone outlets. The inverter AC output does not connect to the utility.
      </text>

      <DiagramBox
        x={16}
        y={32}
        w={156}
        h={64}
        title="Battery +"
        detail={`${volts} V  ${fmt(ah)} Ah  ${chemLabel}`}
        {...box}
      />
      <DiagramBox
        x={230}
        y={32}
        w={150}
        h={64}
        title="Class T fuse"
        detail={`${fmt(fuseA)} A, within 7 in`}
        {...box}
      />
      <DiagramBox
        x={430}
        y={32}
        w={150}
        h={64}
        title="DC disconnect"
        detail={`DC switch, ≥ ${fmt(fuseA)} A`}
        {...box}
      />
      <DiagramBox
        x={640}
        y={32}
        w={204}
        h={64}
        title="Inverter Bat+"
        detail={`${fmt(inverterW)} W, surge ≥ ${fmt(surgeW)} W`}
        {...box}
      />
      <line x1={172} y1={64} x2={230} y2={64} stroke={pos} strokeWidth={3} />
      <line x1={380} y1={64} x2={430} y2={64} stroke={pos} strokeWidth={3} />
      <line x1={580} y1={64} x2={640} y2={64} stroke={pos} strokeWidth={3} />
      <text x={186} y={56} fill={pos} fontSize={11}>
        W1
      </text>
      <text x={392} y={56} fill={pos} fontSize={11}>
        W2
      </text>
      <text x={596} y={56} fill={pos} fontSize={11}>
        W3
      </text>
      <text x={186} y={112} fill={detail} fontSize={11}>
        {`Positive ${cable} red. W1 is the short lead at the battery post.`}
      </text>

      <DiagramBox
        x={16}
        y={132}
        w={156}
        h={64}
        title="Battery −"
        detail="Same battery, negative post"
        {...box}
      />
      <DiagramBox
        x={640}
        y={132}
        w={204}
        h={64}
        title="Inverter Bat−"
        detail="DC negative terminal"
        {...box}
      />
      <line x1={172} y1={164} x2={640} y2={164} stroke={neg} strokeWidth={3} />
      <text x={360} y={156} fill={title} fontSize={11}>
        {`W4  ${cable} black`}
      </text>

      <DiagramBox
        x={16}
        y={232}
        w={156}
        h={64}
        title="Negative post"
        detail="Ground lands here"
        {...box}
      />
      <DiagramBox
        x={640}
        y={232}
        w={204}
        h={64}
        title="Inverter ground lug"
        detail="Standalone bond, per manual"
        {...box}
      />
      <line
        x1={172}
        y1={264}
        x2={640}
        y2={264}
        stroke={ground}
        strokeWidth={2}
        strokeDasharray="6 4"
      />
      <text x={300} y={256} fill={ground} fontSize={11}>
        W5 equipment ground
      </text>

      <DiagramBox
        x={16}
        y={332}
        w={156}
        h={64}
        title="Utility outlet"
        detail="Grid. Charger cord only."
        {...box}
      />
      <DiagramBox
        x={230}
        y={332}
        w={150}
        h={64}
        title="Charger"
        detail={`${volts} V, ${fmt(chargerA)} A`}
        {...box}
      />
      <DiagramBox
        x={430}
        y={332}
        w={150}
        h={64}
        title="Charger fuse"
        detail={`${fmt(chargerFuse)} A at battery +`}
        {...box}
      />
      <DiagramBox
        x={640}
        y={332}
        w={204}
        h={64}
        title="Battery +"
        detail="Ahead of the Class T fuse"
        {...box}
      />
      <line x1={172} y1={364} x2={230} y2={364} stroke={ac} strokeWidth={3} />
      <line x1={380} y1={364} x2={430} y2={364} stroke={pos} strokeWidth={3} />
      <line x1={580} y1={364} x2={640} y2={364} stroke={pos} strokeWidth={3} />
      <text x={178} y={356} fill={ac} fontSize={11}>
        AC
      </text>
      <text x={386} y={356} fill={pos} fontSize={11}>
        W7
      </text>
      <text x={592} y={356} fill={pos} fontSize={11}>
        W6
      </text>
      <text x={16} y={412} fill={detail} fontSize={11}>
        {`W8 ${chargerCable} black from charger DC− to the battery negative post. Charger positive is ${chargerCable} red.`}
      </text>

      <text x={16} y={444} fill={title} fontSize={13} fontWeight={600}>
        Inverter AC outlets, 120 V 60 Hz, one receptacle per load
      </text>
      {outlets.map((load, index) => (
        <DiagramBox
          key={load.id}
          x={16 + index * (outletW + 12)}
          y={456}
          w={outletW}
          h={64}
          title={load.name}
          detail={load.detail}
          {...box}
        />
      ))}
    </svg>
  );
}

export default function InverterSizing() {
  const [loads, setLoads] = useCanvasState<Load[]>("loads", DEFAULT_LOADS);
  const [voltage, setVoltage] = useCanvasState("voltage", "24");
  const [chemistry, setChemistry] = useCanvasState("chemistry", "lifepo4");
  const [preset, setPreset] = useCanvasState<"overnight" | "day" | "custom">(
    "preset",
    "day",
  );

  const volts = voltage === "12" || voltage === "48" ? Number(voltage) : 24;
  const usable = chemistry === "lead" ? 0.5 : 0.9;
  const chemLabel = chemistry === "lead" ? "Lead-acid" : "LiFePO4";

  const plan = useMemo(() => {
    const on = loads.filter((load) => load.enabled);
    const runningW = on.reduce((sum, load) => sum + load.watts, 0);
    const whAc = on.reduce((sum, load) => sum + load.watts * load.hours, 0);
    const surgeW =
      on.length === 0
        ? 0
        : Math.max(
            ...on.map(
              (load) =>
                Math.max(load.surge, load.watts) +
                on
                  .filter((other) => other.id !== load.id)
                  .reduce((sum, other) => sum + other.watts, 0),
            ),
          );
    const continuousNeed = runningW * 1.25;
    const inverterW = nextAtLeast(
      INVERTER_SIZES,
      Math.max(continuousNeed, surgeW / 2),
    );
    const whFromBattery = whAc / EFF;
    const nameplateWh = whFromBattery / usable;
    const ahExact = volts > 0 ? nameplateWh / volts : 0;
    const ahBuy = nextAtLeast(AH_SIZES, ahExact);
    const dcAmps = volts > 0 ? inverterW / (volts * EFF) : 0;
    const fuseA = nextAtLeast(FUSE_SIZES, dcAmps * 1.25);
    const nameplateBuyWh = ahBuy * volts;
    const usableAcWh = nameplateBuyWh * usable * EFF;
    const fullOnHours = runningW > 0 ? usableAcWh / runningW : 0;
    const margin = whAc > 0 ? usableAcWh / whAc : 0;
    const chargerA = Math.max(10, Math.round((ahBuy * 0.2) / 5) * 5);
    const chargerFuse = nextAtLeast(
      [15, 20, 25, 30, 40, 50, 60, 80, 100, 125],
      chargerA * 1.25,
    );
    const chargerCable = copperForFuse(chargerFuse);
    return {
      on,
      runningW,
      whAc,
      surgeW,
      continuousNeed,
      inverterW,
      whFromBattery,
      nameplateWh,
      ahExact,
      ahBuy,
      dcAmps,
      fuseA,
      nameplateBuyWh,
      usableAcWh,
      fullOnHours,
      margin,
      cable: awgForAmps(fuseA),
      chargerA,
      chargerFuse,
      chargerCable,
    };
  }, [loads, usable, volts]);

  function patchLoad(id: LoadId, patch: Partial<Load>) {
    setPreset("custom");
    setLoads((prev) =>
      prev.map((load) => (load.id === id ? { ...load, ...patch } : load)),
    );
  }

  function applyPreset(next: "overnight" | "day") {
    setPreset(next);
    setLoads((prev) =>
      prev.map((load) => ({ ...load, hours: HOURS[next][load.id] })),
    );
  }

  const highCurrent = volts === 12 && plan.dcAmps > 100;
  const oxygenOn = loads.some((load) => load.id === "o2" && load.enabled);
  const cost = {
    inverter: inverterPrice(plan.inverterW),
    battery: batteryPrice(volts, plan.ahBuy, chemistry),
    mainFuse: fusePrice(plan.fuseA),
    mainHolder: fuseHolderPrice(plan.fuseA),
    disconnect: switchPrice(plan.fuseA),
    red: cablePrice(plan.cable, 6),
    black: cablePrice(plan.cable, 5),
    jumper: [0, cablePrice(plan.cable, 1)[1]] as Price,
    lugs: [15, 35] as Price,
    charger: chargerPrice(plan.chargerA, chemistry),
    chargerFuse: [25, 60] as Price,
    chargerCable: cablePrice(plan.chargerCable, 8),
    ground: cablePrice(plan.cable, 4),
    outlets: [0, 25] as Price,
    covers: [8, 20] as Price,
    monitor: [35, 140] as Price,
  };
  const required = [
    cost.inverter,
    cost.battery,
    cost.mainFuse,
    cost.mainHolder,
    cost.disconnect,
    cost.red,
    cost.black,
    cost.lugs,
    cost.charger,
    cost.chargerFuse,
    cost.chargerCable,
    cost.ground,
    cost.outlets,
    cost.covers,
  ].reduce(addPrice, [0, 0]);
  const withOptions = [required, cost.jumper, cost.monitor].reduce(addPrice, [0, 0]);

  return (
    <Stack gap={20}>
      <Stack gap={6}>
        <H1>120 V battery backup</H1>
        <Text tone="secondary">
          Sizing for a refrigerator, lights, and plug-in medical devices on a
          listed pure-sine inverter. 120 V, 60 Hz. Edit the watts to match
          each nameplate. Inverter losses are taken as 88%.
        </Text>
      </Stack>

      <Callout tone="warning" title="Medical devices">
        Read watts from the label on the CPAP, oxygen concentrator, or
        nebulizer. A ventilator or any life-support device needs the backup
        plan from the prescribing clinician, including the device’s own
        battery and a non-electric backup when the care plan requires one. A
        household inverter does not replace that plan. If the device has an
        approved DC cable, power it from the battery and keep it off the
        inverter.
      </Callout>

      <Grid columns={4} gap={16}>
        <Stat
          value={`${fmt(plan.inverterW)} W`}
          label="Pure-sine inverter to buy"
          tone="info"
        />
        <Stat
          value={`${fmt(plan.surgeW)} W`}
          label="Start surge to cover"
          tone={plan.surgeW > 2000 ? "warning" : undefined}
        />
        <Stat
          value={`${fmt(plan.ahBuy)} Ah`}
          label={`${volts} V ${chemLabel} battery`}
        />
        <Stat
          value={`${fmt(plan.whAc / 1000, 2)} kWh`}
          label="AC energy in this profile"
        />
      </Grid>

      <Text>
        Buy a listed pure-sine inverter of at least {fmt(plan.inverterW)} W
        continuous with a surge rating of at least {fmt(plan.surgeW)} W. Pair
        it with a {volts} V {fmt(plan.ahBuy)} Ah {chemLabel} battery (
        {fmt(plan.nameplateBuyWh / 1000, 1)} kWh nameplate). That bank delivers
        about {fmt(plan.usableAcWh / 1000, 2)} kWh at the outlets,{" "}
        {fmt(plan.margin, 2)} times this load profile. If every enabled load
        stayed on together, runtime is about {fmt(plan.fullOnHours, 1)} hours.
      </Text>

      <Stack gap={8}>
        <H2>Wiring diagram</H2>
        <Text tone="secondary">
          Cord-and-plug backup. Red marks DC positive. W4 is DC negative. The
          dashed line is the equipment ground. The blue segment is the
          charger AC cord. Every 120 V load uses the inverter’s own
          receptacle. Nothing from the inverter ties back to the utility
          outlet.
        </Text>
        <WiringDiagram
          volts={volts}
          ah={plan.ahBuy}
          fuseA={plan.fuseA}
          cable={plan.cable}
          inverterW={plan.inverterW}
          surgeW={plan.surgeW}
          chargerA={plan.chargerA}
          chargerFuse={plan.chargerFuse}
          chargerCable={plan.chargerCable}
          chemLabel={chemLabel}
          loads={loads}
        />
        <Text size="small" tone="tertiary">
          Conductor sizes follow this sheet: {plan.cable} on the inverter
          cables, {plan.chargerCable} on the charger cables, Class T{" "}
          {fmt(plan.fuseA)} A, charger fuse {fmt(plan.chargerFuse)} A. The
          inverter manual overrides the ground size.
        </Text>
        {volts > 12 ? (
          <Callout tone="info" title={`${volts} V from 12 V batteries`}>
            Skip the jumpers if you buy one {volts} V battery. To build the
            bank from matched 12 V {fmt(plan.ahBuy)} Ah batteries, chain the
            negative of one to the positive of the next (
            {volts / 12 - 1} {plan.cable} jumper{volts === 24 ? "" : "s"}, about
            12 in each). The free positive at one end and the free negative at
            the other end are the bank posts. Same model, age, and capacity.
            Do not parallel those posts.
          </Callout>
        ) : null}
        <H3>Wire schedule</H3>
        <Table
          headers={["Wire", "Conductor", "From", "To"]}
          rows={[
            [
              "W1",
              `${plan.cable} red, under 7 in`,
              "Battery positive post",
              "Class T fuse, line side",
            ],
            [
              "W2",
              `${plan.cable} red`,
              "Class T fuse, load side",
              "DC disconnect",
            ],
            [
              "W3",
              `${plan.cable} red`,
              "DC disconnect",
              "Inverter Bat+",
            ],
            [
              "W4",
              `${plan.cable} black`,
              "Battery negative post",
              "Inverter Bat−",
            ],
            [
              "W5",
              "Equipment ground, size in the inverter manual",
              "Inverter ground lug",
              "Battery negative post",
            ],
            [
              "W6",
              `${plan.chargerCable} red, under 7 in`,
              "Battery positive post",
              "Charger fuse",
            ],
            [
              "W7",
              `${plan.chargerCable} red`,
              "Charger fuse",
              "Charger DC+",
            ],
            [
              "W8",
              `${plan.chargerCable} black`,
              "Battery negative post",
              "Charger DC−",
            ],
            [
              "AC",
              "Charger’s factory cord",
              "Utility outlet",
              "Charger AC input",
            ],
            ...loads
              .filter((load) => load.enabled)
              .map((load) => [
                load.name,
                "Factory appliance cord",
                "Its own inverter receptacle",
                load.name,
              ]),
          ]}
        />
        <Text>
          Leave the disconnect open and both fuses out while you crimp. Land
          every lug, then confirm red is only on positives and black is only
          on negatives. Measure DC voltage on the inverter Bat+ and Bat−
          before you insert the fuses: it should match the battery, with
          positive on Bat+. Close the disconnect with the outlets empty,
          confirm about 120 V, then plug in the refrigerator, the medical
          device, and the lights. The charger’s AC cord stays in a utility
          outlet.
        </Text>
        <Callout tone="warning" title="Do not backfeed">
          Do not use a cord with a male plug on both ends. Do not plug the
          inverter into a wall outlet. A transfer switch or interlock, if you
          later feed house wiring, is an electrician’s installation, and that
          person has to set the neutral-ground bond from the inverter manual.
          This diagram leaves that bond in the standalone position.
        </Callout>
      </Stack>

      <Stack gap={8}>
        <H2>Bill of materials</H2>
        <Text tone="secondary">
          Shopping list for the diagram above. Estimates are US retail ranges
          in October 2026, parts only, before tax and shipping. The battery
          and the inverter set the total.
        </Text>
        <Grid columns={2} gap={16}>
          <Stat
            value={priceRange(required)}
            label="Parts, one native battery, no monitor"
          />
          <Stat
            value={priceRange(withOptions)}
            label="High side with series jumper and monitor"
            tone="info"
          />
        </Grid>
        <Table
          headers={["Qty", "Part", "Specification", "Estimate"]}
          columnAlign={["right", "left", "left", "right"]}
          rowTone={[
            "info",
            undefined,
            "warning",
            "warning",
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            "warning",
            undefined,
            undefined,
            undefined,
          ]}
          rows={[
            [
              "1",
              "Pure sine inverter",
              `${volts} V DC to 120 V 60 Hz, ${fmt(plan.inverterW)} W continuous, surge at least ${fmt(plan.surgeW)} W, UL 1741 or UL 458, NEMA 5-15 receptacles`,
              priceRange(cost.inverter),
            ],
            [
              volts === 12 ? "1" : `1, or ${volts / 12} × 12 V`,
              `${chemLabel} battery`,
              `${volts} V, ${fmt(plan.ahBuy)} Ah, with a BMS. Calculated minimum ${fmt(plan.ahExact, 0)} Ah. Series batteries must match.`,
              priceRange(cost.battery),
            ],
            [
              "1",
              "Class T fuse",
              `${fmt(plan.fuseA)} A DC. Class T, not an automotive blade fuse. LiFePO4 fault current needs that interrupt rating.`,
              priceRange(cost.mainFuse),
            ],
            [
              "1",
              "Class T fuse holder",
              `Bolted holder rated at least ${fmt(plan.fuseA)} A, mounted within 7 in of the battery positive post`,
              priceRange(cost.mainHolder),
            ],
            [
              "1",
              "DC disconnect",
              `DC-rated battery switch, continuous rating at least ${fmt(plan.fuseA)} A, in the positive lead between the fuse and the inverter. Not an AC wall switch.`,
              priceRange(cost.disconnect),
            ],
            [
              "6 ft",
              "Red battery cable",
              `${plan.cable} copper, 105°C, cut into W1, W2, and W3. Keep the run short.`,
              priceRange(cost.red),
            ],
            [
              "5 ft",
              "Black battery cable",
              `${plan.cable} copper, 105°C, for W4`,
              priceRange(cost.black),
            ],
            ...(volts > 12
              ? [
                  [
                    `0 or ${volts / 12 - 1}`,
                    "Series jumper",
                    `${plan.cable} copper, about 12 in, only if the bank is separate 12 V batteries. None if you buy one ${volts} V battery.`,
                    priceRange(cost.jumper),
                  ],
                ]
              : []),
            [
              "1 pack",
              "Ring terminals",
              `Tinned copper, one per cable end, barrel matched to each AWG and stud (often M8 or 5/16 in). Crimp with a hex die. Do not solder these lugs. Buy about 20.`,
              priceRange(cost.lugs),
            ],
            [
              "1",
              `${chemLabel} charger`,
              `${volts} V, ${fmt(plan.chargerA)} A, charge profile for ${chemLabel}. AC cord plugs into a utility outlet only.`,
              priceRange(cost.charger),
            ],
            [
              "1",
              "Charger fuse and holder",
              `${fmt(plan.chargerFuse)} A Class T or other high-interrupt DC fuse, within 7 in of the battery positive, on W6`,
              priceRange(cost.chargerFuse),
            ],
            [
              "4 ft",
              "Charger cable pair",
              `${plan.chargerCable} red and black, 105°C copper, for W6, W7, and W8`,
              priceRange(cost.chargerCable),
            ],
            [
              "4 ft",
              "Equipment ground",
              "Stranded copper, gauge from the inverter manual. If the manual does not specify, match the negative battery cable.",
              priceRange(cost.ground),
            ],
            [
              String(Math.max(plan.on.length, 1)),
              "AC receptacles",
              "Use the inverter’s outlets. Refrigerator on its own receptacle. Medical device on its own receptacle. Lights may use a 15 A strip that feeds lighting only.",
              priceRange(cost.outlets),
            ],
            [
              "1",
              "Insulating covers",
              "Boots or covers for the positive post, both fuse holders, and the disconnect",
              priceRange(cost.covers),
            ],
            [
              "1",
              "Battery monitor",
              `Optional shunt on the negative cable, rated at least ${fmt(plan.fuseA)} A, so you can see state of charge`,
              priceRange(cost.monitor),
            ],
          ]}
        />
        <Text size="small" tone="tertiary">
          Source: US street prices checked October 2026. At the default size, a
          listed 1,000 W 24 V pure-sine inverter is about $250–$650, and a
          24 V 150 Ah LiFePO4 battery is about $800–$1,600. The parts total
          omits the series jumper and the monitor. Estimates follow the
          voltage, amp-hours, and inverter size selected above.
        </Text>
      </Stack>

      {plan.on.length > 0 ? (
        <Stack gap={8}>
          <H2>Daily AC energy by load</H2>
          <BarChart
            horizontal
            height={220}
            categories={plan.on.map((load) => load.name)}
            series={[
              {
                name: "AC energy",
                data: plan.on.map((load) =>
                  Math.round(load.watts * load.hours),
                ),
                tone: "info",
              },
            ]}
            valueSuffix=" Wh"
            showValues
          />
          <Text size="small" tone="tertiary">
            Watt-hours = running watts × hours. Refrigerator hours are
            compressor-on time, not hours the door is closed. Source: planning
            defaults edited in the table below.
          </Text>
        </Stack>
      ) : (
        <Callout tone="info" title="No loads selected">
          Turn on at least one load to size the inverter and battery.
        </Callout>
      )}

      <Stack gap={8}>
        <H2>Loads</H2>
        <Row gap={8} align="center">
          <Pill active={preset === "overnight"} onClick={() => applyPreset("overnight")}>
            Overnight
          </Pill>
          <Pill active={preset === "day"} onClick={() => applyPreset("day")}>
            Full day
          </Pill>
          <Text size="small" tone="tertiary">
            Presets change hours only. Full day uses about 8 compressor hours
            for the fridge, which is roughly 1.4 kWh at 180 W.
          </Text>
        </Row>
        <Table
          headers={[
            "Load",
            "On",
            "Running (W)",
            "Start (W)",
            "Hours",
            "Energy (Wh)",
          ]}
          columnAlign={["left", "center", "right", "right", "right", "right"]}
          rowTone={loads.map((load) =>
            load.id === "fridge"
              ? "info"
              : load.id === "lights"
                ? "neutral"
                : "warning",
          )}
          rows={loads.map((load) => [
            load.name,
            <Checkbox
              key={`${load.id}-on`}
              checked={load.enabled}
              onChange={(checked) => patchLoad(load.id, { enabled: checked })}
            />,
            <TextInput
              key={`${load.id}-w`}
              type="number"
              value={String(load.watts)}
              onChange={(value) =>
                patchLoad(load.id, { watts: clampNonNeg(value, load.watts) })
              }
              style={{ width: 72 }}
            />,
            <TextInput
              key={`${load.id}-s`}
              type="number"
              value={String(load.surge)}
              onChange={(value) =>
                patchLoad(load.id, { surge: clampNonNeg(value, load.surge) })
              }
              style={{ width: 72 }}
            />,
            <TextInput
              key={`${load.id}-h`}
              type="number"
              value={String(load.hours)}
              onChange={(value) =>
                patchLoad(load.id, { hours: clampNonNeg(value, load.hours) })
              }
              style={{ width: 72 }}
            />,
            load.enabled ? fmt(Math.round(load.watts * load.hours)) : "—",
          ])}
        />
        <Text size="small" tone="secondary">
          Refrigerator start is often 800–1,500 W on a conventional compressor.
          A variable-speed fridge can be much lower. CPAP with a heated
          humidifier is often 60–90 W. A stationary oxygen concentrator is
          often 300–600 W and, left on all day, sets the battery size. A
          yellow EnergyGuide label is better than a watt guess: yearly kWh ÷
          365 is the fridge’s daily energy.
        </Text>
      </Stack>

      {oxygenOn ? (
        <Callout tone="warning" title="Oxygen concentrator is on">
          Continuous oxygen dominates the battery. Confirm the wattage on that
          unit and whether the prescription allows any time off power. Keep
          the backup cylinders specified in the care plan.
        </Callout>
      ) : null}

      <Divider />

      <Stack gap={8}>
        <H2>Battery bank</H2>
        <Grid columns={2} gap={12}>
          <Stack gap={4}>
            <Text size="small" tone="secondary">
              System voltage
            </Text>
            <Select
              value={String(volts)}
              onChange={setVoltage}
              options={[
                { value: "12", label: "12 V" },
                { value: "24", label: "24 V" },
                { value: "48", label: "48 V" },
              ]}
            />
          </Stack>
          <Stack gap={4}>
            <Text size="small" tone="secondary">
              Chemistry
            </Text>
            <Select
              value={chemistry}
              onChange={setChemistry}
              options={[
                { value: "lifepo4", label: "LiFePO4 (use 90%)" },
                { value: "lead", label: "Lead-acid (use 50%)" },
              ]}
            />
          </Stack>
        </Grid>
        {highCurrent ? (
          <Callout tone="warning" title="12 V current is high">
            This inverter draws about {fmt(plan.dcAmps, 0)} A at 12 V. A 24 V
            or 48 V bank uses thinner cable and a smaller fuse for the same
            watts.
          </Callout>
        ) : null}
        {chemistry === "lead" ? (
          <Callout tone="info" title="Lead-acid usable capacity">
            Plan on using about half of the nameplate amp-hours so the bank
            is not routinely flattened. Flooded batteries need a ventilated
            space. LiFePO4 is the better fit indoors for this backup.
          </Callout>
        ) : null}
        <Table
          headers={["Item", "Specification"]}
          rows={[
            [
              "Inverter",
              `${fmt(plan.inverterW)} W continuous, pure sine, 120 V 60 Hz, surge ≥ ${fmt(plan.surgeW)} W`,
            ],
            [
              "Running load",
              `${fmt(plan.runningW)} W simultaneous, ${fmt(plan.continuousNeed)} W with 25% headroom`,
            ],
            [
              "Battery",
              `${volts} V, ${fmt(plan.ahBuy)} Ah ${chemLabel} (calculated minimum ${fmt(plan.ahExact, 0)} Ah)`,
            ],
            [
              "Usable AC energy",
              `${fmt(plan.usableAcWh / 1000, 2)} kWh after ${fmt(usable * 100, 0)}% depth and 88% inverter efficiency`,
            ],
            [
              "DC fuse or breaker",
              `${fmt(plan.fuseA)} A on the battery positive, at the rating the inverter manual requires`,
            ],
            [
              "Battery cable",
              `${plan.cable} copper, both conductors, kept short. Upsize if the manual asks`,
            ],
            [
              "Recharge",
              `About ${fmt(plan.ahBuy * 0.2, 0)} A (${chemLabel === "LiFePO4" ? "0.2C" : "C/5"}) so a depleted bank recovers in roughly 5 hours`,
            ],
          ]}
        />
        <Text size="small" tone="tertiary">
          Fuse and cable are planning estimates from 125% of the inverter’s
          full DC input. The inverter manual and the electrician’s reading of
          the code override this table.
        </Text>
      </Stack>

    </Stack>
  );
}
