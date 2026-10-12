import {
  Callout,
  H1,
  H2,
  Pill,
  Row,
  Stack,
  Table,
  Text,
  useCanvasState,
  useHostTheme,
} from "cursor/canvas";

const POS = 252;
const NEG = 452;
const BAT_X = 118;
const W8_X = 178;
const NODE_X = 220;
const F1_X = 318;
const SW_X = 400;
const INV_L = 512;
const INV_R = 772;
const INV_T = 172;
const INV_B = 472;
const F2_X = 292;
const DC_P = 56;
const DC_N = 92;
const CHG_L = 352;
const CHG_R = 548;
const CHG_T = 28;
const CHG_B = 120;
const L_BUS = 548;
const N_BUS = 708;
const L_DROP = 812;
const N_DROP = 848;

function Cells({
  x,
  top,
  pairs,
  gap,
  ink,
}: {
  x: number;
  top: number;
  pairs: number;
  gap: number;
  ink: string;
}) {
  const plates = [];
  for (let i = 0; i < pairs * 2; i++) {
    const long = i % 2 === 0;
    const half = long ? 26 : 13;
    const y = top + i * gap;
    plates.push(
      <line
        key={i}
        x1={x - half}
        x2={x + half}
        y1={y}
        y2={y}
        stroke={ink}
        strokeWidth={long ? 3 : 1.5}
      />,
    );
  }
  return <g>{plates}</g>;
}

function Fuse({
  x,
  y,
  ink,
  fill,
}: {
  x: number;
  y: number;
  ink: string;
  fill: string;
}) {
  return (
    <g>
      <rect
        x={x - 22}
        y={y - 10}
        width={44}
        height={20}
        rx={2}
        fill={fill}
        stroke={ink}
        strokeWidth={1.5}
      />
      <line
        x1={x - 14}
        y1={y}
        x2={x + 14}
        y2={y}
        stroke={ink}
        strokeWidth={1.5}
      />
    </g>
  );
}

function OpenSwitch({ x, y, ink }: { x: number; y: number; ink: string }) {
  return (
    <g>
      <line x1={x} y1={y} x2={x + 8} y2={y} stroke={ink} strokeWidth={2.5} />
      <circle cx={x + 8} cy={y} r={3.5} fill={ink} />
      <line
        x1={x + 8}
        y1={y}
        x2={x + 46}
        y2={y - 24}
        stroke={ink}
        strokeWidth={2.5}
      />
      <circle cx={x + 56} cy={y} r={3.5} fill="none" stroke={ink} strokeWidth={2} />
    </g>
  );
}

function Receptacle({
  x,
  y,
  stroke,
  fill,
  slot,
  ground,
}: {
  x: number;
  y: number;
  stroke: string;
  fill: string;
  slot: string;
  ground: string;
}) {
  return (
    <g>
      <rect
        x={x - 16}
        y={y - 22}
        width={32}
        height={46}
        rx={4}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
      <rect x={x - 8} y={y - 12} width={4} height={12} rx={1} fill={slot} />
      <rect x={x + 4} y={y - 12} width={4} height={12} rx={1} fill={slot} />
      <circle cx={x} cy={y + 12} r={3} fill={ground} />
    </g>
  );
}

function Dot({ x, y, fill }: { x: number; y: number; fill: string }) {
  return <circle cx={x} cy={y} r={3.5} fill={fill} />;
}

function Schematic({ series }: { series: boolean }) {
  const theme = useHostTheme();
  const pos = theme.category.red;
  const neg = theme.text.primary;
  const ground = theme.category.green;
  const ac = theme.category.blue;
  const ink = theme.text.primary;
  const muted = theme.text.secondary;
  const fill = theme.fill.tertiary;
  const bg = theme.bg.editor;
  const stroke = theme.stroke.primary;
  const accent = theme.accent.primary;

  const swOut = SW_X + 56;
  const outlets = [
    {
      x: 300,
      title: "Refrigerator",
      lines: ["Own receptacle", "180 W, start 1,200 W"],
      stroke,
    },
    {
      x: 560,
      title: "Airway clearance",
      lines: ["Own receptacle", "250 W, start 400 W"],
      stroke: accent,
    },
    {
      x: 860,
      title: "15 A power strip",
      lines: ["Flat screen 100 W", "Modem and router 25 W", "LED lamps 60 W"],
      stroke,
    },
  ];

  return (
    <svg
      viewBox="0 0 1100 748"
      width="100%"
      role="img"
      aria-label="Schematic of the 24 volt battery, Class T fuse, charger fuse, DC disconnect, pure sine inverter, charger, and 120 volt outlets"
    >
      <text x={16} y={44} fill={ink} fontSize={13} fontWeight={600}>
        Cord-and-plug backup
      </text>
      <text x={16} y={64} fill={muted} fontSize={11}>
        24 V DC to 120 V 60 Hz
      </text>
      <text x={16} y={82} fill={muted} fontSize={11}>
        Not to scale. S1 is drawn open.
      </text>
      <text x={16} y={100} fill={muted} fontSize={11}>
        Battery leads are 6 AWG copper.
      </text>

      <rect
        x={860}
        y={24}
        width={220}
        height={112}
        rx={6}
        fill={fill}
        stroke={stroke}
      />
      <text x={874} y={46} fill={ink} fontSize={12} fontWeight={600}>
        Conductors
      </text>
      <line x1={874} y1={64} x2={902} y2={64} stroke={pos} strokeWidth={2.5} />
      <text x={910} y={68} fill={muted} fontSize={11}>
        DC positive
      </text>
      <line x1={874} y1={84} x2={902} y2={84} stroke={neg} strokeWidth={2.5} />
      <text x={910} y={88} fill={muted} fontSize={11}>
        DC negative
      </text>
      <line
        x1={874}
        y1={104}
        x2={902}
        y2={104}
        stroke={ground}
        strokeWidth={2}
        strokeDasharray="5 3"
      />
      <text x={910} y={108} fill={muted} fontSize={11}>
        Equipment ground
      </text>
      <line x1={874} y1={124} x2={902} y2={124} stroke={ac} strokeWidth={2.5} />
      <text x={910} y={128} fill={muted} fontSize={11}>
        AC, 120 V 60 Hz
      </text>

      {series ? (
        <g>
          <line x1={BAT_X} y1={POS} x2={BAT_X} y2={266} stroke={pos} strokeWidth={2.5} />
          <text x={BAT_X - 36} y={274} fill={pos} fontSize={12} fontWeight={600}>
            +
          </text>
          <Cells x={BAT_X} top={270} pairs={3} gap={11} ink={ink} />
          <text x={BAT_X - 36} y={332} fill={ink} fontSize={12} fontWeight={600}>
            −
          </text>
          <line
            x1={BAT_X}
            y1={326}
            x2={BAT_X}
            y2={352}
            stroke={ink}
            strokeWidth={2.5}
          />
          <text x={BAT_X + 10} y={344} fill={muted} fontSize={11}>
            J1
          </text>
          <text x={BAT_X - 36} y={366} fill={pos} fontSize={12} fontWeight={600}>
            +
          </text>
          <Cells x={BAT_X} top={360} pairs={3} gap={11} ink={ink} />
          <line x1={BAT_X} y1={416} x2={BAT_X} y2={NEG} stroke={neg} strokeWidth={2.5} />
          <text x={BAT_X - 36} y={430} fill={ink} fontSize={12} fontWeight={600}>
            −
          </text>
          <text x={16} y={300} fill={ink} fontSize={11} fontWeight={600}>
            B1
          </text>
          <text x={16} y={316} fill={muted} fontSize={11}>
            12 V 200 Ah
          </text>
          <text x={16} y={400} fill={ink} fontSize={11} fontWeight={600}>
            B2
          </text>
          <text x={16} y={416} fill={muted} fontSize={11}>
            12 V 200 Ah
          </text>
        </g>
      ) : (
        <g>
          <line x1={BAT_X} y1={POS} x2={BAT_X} y2={286} stroke={pos} strokeWidth={2.5} />
          <text x={BAT_X - 40} y={300} fill={pos} fontSize={13} fontWeight={600}>
            +
          </text>
          <Cells x={BAT_X} top={292} pairs={4} gap={15} ink={ink} />
          <line x1={BAT_X} y1={398} x2={BAT_X} y2={NEG} stroke={neg} strokeWidth={2.5} />
          <text x={BAT_X - 40} y={424} fill={ink} fontSize={13} fontWeight={600}>
            −
          </text>
          <text x={16} y={330} fill={ink} fontSize={12} fontWeight={600}>
            B1
          </text>
          <text x={16} y={348} fill={muted} fontSize={11}>
            24 V 200 Ah
          </text>
          <text x={16} y={364} fill={muted} fontSize={11}>
            LiFePO4
          </text>
          <text x={16} y={380} fill={muted} fontSize={11}>
            BMS inside
          </text>
        </g>
      )}

      <line x1={BAT_X} y1={POS} x2={F1_X - 22} y2={POS} stroke={pos} strokeWidth={2.5} />
      <Dot x={NODE_X} y={POS} fill={pos} />
      <text x={NODE_X - 18} y={POS - 10} fill={pos} fontSize={11} fontWeight={600}>
        Bat+
      </text>
      <text x={128} y={POS + 18} fill={muted} fontSize={11}>
        W1 under 7 in
      </text>

      <line x1={NODE_X} y1={POS} x2={NODE_X} y2={DC_P} stroke={pos} strokeWidth={2.5} />
      <line x1={NODE_X} y1={DC_P} x2={F2_X - 22} y2={DC_P} stroke={pos} strokeWidth={2.5} />
      <Fuse x={F2_X} y={DC_P} ink={pos} fill={bg} />
      <line x1={F2_X + 22} y1={DC_P} x2={CHG_L} y2={DC_P} stroke={pos} strokeWidth={2.5} />
      <text x={NODE_X + 8} y={150} fill={muted} fontSize={11}>
        W6 under 7 in
      </text>
      <text x={F2_X - 24} y={DC_P - 16} fill={ink} fontSize={11} fontWeight={600}>
        F2 50 A
      </text>
      <text x={F2_X + 28} y={DC_P - 8} fill={muted} fontSize={11}>
        W7
      </text>

      <line x1={CHG_L} y1={DC_N} x2={NODE_X + 8} y2={DC_N} stroke={neg} strokeWidth={2.5} />
      <path
        d={`M ${NODE_X + 8} ${DC_N} A 8 8 0 0 0 ${NODE_X - 8} ${DC_N}`}
        fill="none"
        stroke={neg}
        strokeWidth={2.5}
      />
      <line x1={NODE_X - 8} y1={DC_N} x2={W8_X} y2={DC_N} stroke={neg} strokeWidth={2.5} />
      <line x1={W8_X} y1={DC_N} x2={W8_X} y2={POS - 8} stroke={neg} strokeWidth={2.5} />
      <path
        d={`M ${W8_X} ${POS - 8} A 8 8 0 0 1 ${W8_X} ${POS + 8}`}
        fill="none"
        stroke={neg}
        strokeWidth={2.5}
      />
      <line x1={W8_X} y1={POS + 8} x2={W8_X} y2={NEG} stroke={neg} strokeWidth={2.5} />
      <Dot x={W8_X} y={NEG} fill={neg} />
      <text x={W8_X + 8} y={360} fill={muted} fontSize={11}>
        W8
      </text>

      <Fuse x={F1_X} y={POS} ink={pos} fill={bg} />
      <text x={F1_X - 36} y={POS - 18} fill={ink} fontSize={11} fontWeight={600}>
        F1
      </text>
      <text x={F1_X - 36} y={POS - 32} fill={muted} fontSize={11}>
        60 A Class T
      </text>
      <line x1={F1_X + 22} y1={POS} x2={SW_X} y2={POS} stroke={pos} strokeWidth={2.5} />
      <text x={F1_X + 28} y={POS + 18} fill={muted} fontSize={11}>
        W2
      </text>
      <OpenSwitch x={SW_X} y={POS} ink={pos} />
      <text x={SW_X + 8} y={POS - 52} fill={muted} fontSize={11}>
        at least 60 A
      </text>
      <text x={SW_X + 8} y={POS - 38} fill={ink} fontSize={11} fontWeight={600}>
        S1 open
      </text>
      <line x1={swOut} y1={POS} x2={INV_L} y2={POS} stroke={pos} strokeWidth={2.5} />
      <text x={swOut + 4} y={POS + 18} fill={muted} fontSize={11}>
        W3
      </text>

      <line x1={BAT_X} y1={NEG} x2={INV_L} y2={NEG} stroke={neg} strokeWidth={2.5} />
      <text x={390} y={NEG + 16} fill={muted} fontSize={11}>
        W4
      </text>
      <text x={NODE_X - 16} y={NEG + 18} fill={ink} fontSize={11} fontWeight={600}>
        Bat−
      </text>

      <line
        x1={300}
        y1={NEG}
        x2={300}
        y2={508}
        stroke={ground}
        strokeWidth={2}
        strokeDasharray="5 3"
      />
      <Dot x={300} y={NEG} fill={neg} />
      <line
        x1={300}
        y1={508}
        x2={640}
        y2={508}
        stroke={ground}
        strokeWidth={2}
        strokeDasharray="5 3"
      />
      <line
        x1={640}
        y1={508}
        x2={640}
        y2={INV_B}
        stroke={ground}
        strokeWidth={2}
        strokeDasharray="5 3"
      />
      <text x={360} y={500} fill={ground} fontSize={11}>
        W5
      </text>

      <rect
        x={INV_L}
        y={INV_T}
        width={INV_R - INV_L}
        height={INV_B - INV_T}
        rx={6}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
      <text x={INV_L + 16} y={INV_T + 26} fill={ink} fontSize={13} fontWeight={600}>
        U1  Pure sine inverter
      </text>
      <text x={INV_L + 16} y={INV_T + 46} fill={muted} fontSize={11}>
        1,000 W continuous
      </text>
      <text x={INV_L + 16} y={INV_T + 62} fill={muted} fontSize={11}>
        Surge at least 1,635 W
      </text>
      <text x={INV_L + 16} y={INV_T + 78} fill={muted} fontSize={11}>
        24 V DC to 120 V 60 Hz
      </text>
      <path
        d={`M ${INV_L + 24} 360 C ${INV_L + 40} 344, ${INV_L + 48} 344, ${INV_L + 64} 360 S ${INV_L + 88} 376, ${INV_L + 104} 360`}
        fill="none"
        stroke={accent}
        strokeWidth={2}
      />
      <text x={INV_L + 14} y={POS - 8} fill={pos} fontSize={11} fontWeight={600}>
        Bat+
      </text>
      <text x={INV_L + 14} y={NEG - 8} fill={ink} fontSize={11} fontWeight={600}>
        Bat−
      </text>
      <text x={INV_R - 36} y={262} fill={ac} fontSize={11} fontWeight={600}>
        L
      </text>
      <text x={INV_R - 36} y={328} fill={ac} fontSize={11} fontWeight={600}>
        N
      </text>
      <line
        x1={INV_R - 36}
        y1={340}
        x2={INV_R - 36}
        y2={430}
        stroke={muted}
        strokeWidth={1.5}
      />
      <line
        x1={INV_R - 36}
        y1={430}
        x2={640}
        y2={430}
        stroke={muted}
        strokeWidth={1.5}
      />
      <line x1={640} y1={430} x2={640} y2={INV_B} stroke={muted} strokeWidth={1.5} />
      <text x={INV_L + 16} y={392} fill={muted} fontSize={11}>
        N–G bond
      </text>
      <text x={INV_L + 16} y={408} fill={muted} fontSize={11}>
        standalone position
      </text>
      <text x={616} y={INV_B - 8} fill={ground} fontSize={11} fontWeight={600}>
        GND
      </text>

      <rect
        x={CHG_L}
        y={CHG_T}
        width={CHG_R - CHG_L}
        height={CHG_B - CHG_T}
        rx={6}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
      />
      <text x={CHG_L + 44} y={CHG_T + 28} fill={ink} fontSize={13} fontWeight={600}>
        G1 Charger
      </text>
      <text x={CHG_L + 44} y={CHG_T + 48} fill={muted} fontSize={11}>
        24 V, 40 A
      </text>
      <text x={CHG_L + 44} y={CHG_T + 64} fill={muted} fontSize={11}>
        LiFePO4 profile
      </text>
      <text x={CHG_L + 8} y={DC_P + 4} fill={pos} fontSize={11} fontWeight={600}>
        +
      </text>
      <text x={CHG_L + 8} y={DC_N + 4} fill={ink} fontSize={11} fontWeight={600}>
        −
      </text>
      <text x={CHG_R - 28} y={52} fill={ac} fontSize={11} fontWeight={600}>
        AC
      </text>

      <line x1={CHG_R} y1={48} x2={620} y2={48} stroke={ac} strokeWidth={2.5} />
      <text x={558} y={42} fill={ac} fontSize={11}>
        AC cord
      </text>
      <rect x={620} y={28} width={168} height={72} rx={6} fill={fill} stroke={stroke} />
      <text x={634} y={54} fill={ink} fontSize={12} fontWeight={600}>
        Utility outlet
      </text>
      <text x={634} y={74} fill={muted} fontSize={11}>
        Charger cord only
      </text>
      <text x={634} y={90} fill={muted} fontSize={11}>
        No tie to U1
      </text>

      <line x1={INV_R} y1={270} x2={L_DROP} y2={270} stroke={ac} strokeWidth={2.5} />
      <line x1={L_DROP} y1={270} x2={L_DROP} y2={L_BUS} stroke={ac} strokeWidth={2.5} />
      <line x1={200} y1={L_BUS} x2={1040} y2={L_BUS} stroke={ac} strokeWidth={2.5} />
      <text x={200} y={L_BUS - 10} fill={ac} fontSize={11} fontWeight={600}>
        L  inverter hot
      </text>

      <line x1={INV_R} y1={340} x2={N_DROP} y2={340} stroke={ac} strokeWidth={2.5} />
      <line x1={N_DROP} y1={340} x2={N_DROP} y2={L_BUS - 8} stroke={ac} strokeWidth={2.5} />
      <path
        d={`M ${N_DROP} ${L_BUS - 8} A 8 8 0 0 1 ${N_DROP} ${L_BUS + 8}`}
        fill="none"
        stroke={ac}
        strokeWidth={2.5}
      />
      <line x1={N_DROP} y1={L_BUS + 8} x2={N_DROP} y2={N_BUS} stroke={ac} strokeWidth={2.5} />
      <line x1={200} y1={N_BUS} x2={1040} y2={N_BUS} stroke={ac} strokeWidth={2.5} />
      <text x={200} y={N_BUS + 16} fill={ac} fontSize={11} fontWeight={600}>
        N  inverter neutral
      </text>

      {outlets.map((outlet) => (
        <g key={outlet.title}>
          <line
            x1={outlet.x}
            y1={L_BUS}
            x2={outlet.x}
            y2={590}
            stroke={ac}
            strokeWidth={2.5}
          />
          <Dot x={outlet.x} y={L_BUS} fill={ac} />
          <Receptacle
            x={outlet.x}
            y={612}
            stroke={outlet.stroke}
            fill={bg}
            slot={ink}
            ground={ground}
          />
          <line
            x1={outlet.x}
            y1={634}
            x2={outlet.x}
            y2={N_BUS}
            stroke={ac}
            strokeWidth={2.5}
          />
          <Dot x={outlet.x} y={N_BUS} fill={ac} />
          <text x={outlet.x + 24} y={596} fill={ink} fontSize={12} fontWeight={600}>
            {outlet.title}
          </text>
          {outlet.lines.map((line, index) => (
            <text
              key={line}
              x={outlet.x + 24}
              y={614 + index * 14}
              fill={muted}
              fontSize={11}
            >
              {line}
            </text>
          ))}
        </g>
      ))}
    </svg>
  );
}

export default function BackupSchematic() {
  const [bank, setBank] = useCanvasState<"single" | "series">("bank", "single");
  const series = bank === "series";

  return (
    <Stack gap={16}>
      <Stack gap={6}>
        <H1>Backup schematic</H1>
        <Text tone="secondary">
          Cord-and-plug wiring for the refrigerator, flat screen, internet
          gear, lamps, and airway-clearance device. The charger is the only
          cord on the utility outlet. Inverter hot and neutral feed the
          outlets below and stop there.
        </Text>
      </Stack>

      <Row gap={8} align="center">
        <Pill active={!series} onClick={() => setBank("single")}>
          One 24 V battery
        </Pill>
        <Pill active={series} onClick={() => setBank("series")}>
          Two 12 V batteries in series
        </Pill>
      </Row>

      <Schematic series={series} />

      <Text size="small" tone="tertiary">
        Planning schematic for the loads in the design notes. Jumps in a wire
        mean the conductors cross and do not connect. The round hole on each
        outlet is the equipment ground, bonded to neutral inside the inverter
        in the standalone position and carried to the battery negative on W5.
        W1 and W6 are each under 7 inches on the built wire. October 2026.
      </Text>

      {series ? (
        <Callout tone="info" title="Series jumper J1">
          J1 is about 12 inches of 6 AWG from the negative of B1 to the
          positive of B2. Use two batteries of the same model, age, and
          capacity. The free positive on B1 and the free negative on B2 are
          the bank posts. Do not parallel those posts.
        </Callout>
      ) : null}

      <H2>Wire schedule</H2>
      <Table
        headers={["Wire", "Conductor", "From", "To"]}
        rows={[
          [
            "W1",
            "6 AWG red, under 7 in",
            "Battery positive post",
            "F1 line side",
          ],
          ["W2", "6 AWG red", "F1 load side", "S1 DC disconnect"],
          ["W3", "6 AWG red", "S1 DC disconnect", "U1 Bat+"],
          ["W4", "6 AWG black", "Battery negative post", "U1 Bat−"],
          [
            "W5",
            "Equipment ground, gauge in the inverter manual",
            "U1 ground lug",
            "Battery negative post",
          ],
          [
            "W6",
            "6 AWG red, under 7 in",
            "Battery positive post",
            "F2 line side",
          ],
          ["W7", "6 AWG red", "F2 load side", "G1 DC+"],
          ["W8", "6 AWG black", "Battery negative post", "G1 DC−"],
          ...(series
            ? [
                [
                  "J1",
                  "6 AWG, about 12 in",
                  "B1 negative",
                  "B2 positive",
                ],
              ]
            : []),
          ["AC", "Charger factory cord", "Utility outlet", "G1 AC input"],
          [
            "Loads",
            "Factory appliance cords",
            "U1 receptacles",
            "Refrigerator, airway device, and the 15 A strip",
          ],
        ]}
      />

      <Callout tone="warning" title="Do not backfeed">
        Do not use a cord with a male plug on both ends, and do not plug U1
        into a wall outlet. Leave S1 open and both fuses out until every lug
        is crimped and the DC polarity on Bat+ and Bat− matches the battery.
        The refrigerator and the airway-clearance device each use their own
        receptacle. Torque each stud to the hardware listing.
      </Callout>
    </Stack>
  );
}
