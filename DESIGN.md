# 120 V battery backup design

Cord-and-plug backup for a refrigerator, LED lights, and a CPAP. The inverter outlets feed the appliances. The charger is the only cord that plugs into a utility outlet. The inverter output is not tied to house wiring.

This is a planning design. The inverter manual, and an electrician for any later connection to house wiring, override the cable and fuse sizes below.

## Loads

Full-day profile. Refrigerator hours are compressor-on time, not hours the door stays closed.

| Load | Running | Start | Hours | Energy |
|---|---:|---:|---:|---:|
| Refrigerator | 180 W | 1,200 W | 8 | 1.44 kWh |
| LED lights | 60 W | 60 W | 8 | 0.48 kWh |
| CPAP with humidifier | 70 W | 90 W | 8 | 0.56 kWh |
| **Total** | **310 W** | **1,330 W** | | **2.48 kWh** |

The start figure is the refrigerator compressor starting while the lights and CPAP stay on.

An oxygen concentrator is not in this profile. A stationary unit is often 300–600 W and, left on all day, sets the battery size. A ventilator or other life-support device needs the backup plan from the prescribing clinician, including the device battery and any required cylinders.

Read watts from the label on each medical device. If the CPAP has an approved DC cable, run it from the battery and keep it off the inverter.

## What to buy

| Item | Specification |
|---|---|
| Inverter | 1,000 W continuous, pure sine, 24 V DC to 120 V 60 Hz, surge at least 1,330 W, UL 1741 or UL 458, NEMA 5-15 receptacles |
| Battery | 24 V, 150 Ah LiFePO4 with a BMS (3.6 kWh nameplate). One 24 V battery, or two matched 12 V 150 Ah batteries in series |
| Main fuse | 60 A Class T, within 7 in of the battery positive |
| DC disconnect | DC-rated battery switch, at least 60 A, between the fuse and the inverter |
| Inverter cables | 6 AWG copper, 105°C |
| Charger | 24 V, 30 A, LiFePO4 charge profile. AC cord stays in a utility outlet |
| Charger fuse | 40 A, high-interrupt, within 7 in of the battery positive |
| Charger cables | 8 AWG copper |

Inverter losses are taken as 88%. LiFePO4 usable capacity is taken as 90%. The bank then delivers about 2.85 kWh at the outlets, about 15% above this profile. If the fridge, lights, and CPAP all stayed on together, runtime is about 9 hours.

Calculated battery minimum is 131 Ah at 24 V. Buy 150 Ah.

## Wiring

```mermaid
flowchart TB
  Wall["Utility outlet"] -->|charger AC cord| Charger["24 V 30 A LiFePO4 charger"]
  Charger -->|W7 8 AWG red| ChgFuse["40 A charger fuse"]
  ChgFuse -->|W6 8 AWG red, under 7 in| BatPos["Battery positive"]
  Charger -->|W8 8 AWG black| BatNeg["Battery negative"]
  BatPos -->|W1 6 AWG red, under 7 in| Fuse["60 A Class T fuse"]
  Fuse -->|W2 6 AWG red| Disc["DC disconnect"]
  Disc -->|W3 6 AWG red| Inv["1000 W pure sine inverter"]
  BatNeg -->|W4 6 AWG black| Inv
  Inv -.->|W5 equipment ground| BatNeg
  Inv --> Fridge["Refrigerator, own receptacle"]
  Inv --> CPAP["CPAP, own receptacle"]
  Inv --> Lights["LED lights, own receptacle"]
```

W6 lands on the battery positive post, on the battery side of the 60 A fuse, so the charger has its own fuse.

| Wire | Conductor | From | To |
|---|---|---|---|
| W1 | 6 AWG red, under 7 in | Battery positive | Class T fuse, line side |
| W2 | 6 AWG red | Class T fuse, load side | DC disconnect |
| W3 | 6 AWG red | DC disconnect | Inverter Bat+ |
| W4 | 6 AWG black | Battery negative | Inverter Bat− |
| W5 | Equipment ground, size in the inverter manual | Inverter ground lug | Battery negative |
| W6 | 8 AWG red, under 7 in | Battery positive | Charger fuse |
| W7 | 8 AWG red | Charger fuse | Charger DC+ |
| W8 | 8 AWG black | Battery negative | Charger DC− |
| AC | Charger factory cord | Utility outlet | Charger AC input |

Leave the inverter neutral-ground bond in the standalone position the manual specifies. Do not use a cord with a male plug on both ends. Do not plug the inverter into a wall outlet.

### Series batteries

Skip the jumper if you buy one 24 V battery. To build 24 V from two matched 12 V 150 Ah batteries, connect the negative of one to the positive of the other with about 12 in of 6 AWG. The free positive and the free negative are the bank posts. Same model, age, and capacity. Do not parallel those posts.

### Landing order

1. Disconnect open, both fuses out.
2. Crimp and land every lug. Red only on positives, black only on negatives.
3. Measure DC voltage on inverter Bat+ and Bat−. It must match the battery, positive on Bat+.
4. Insert the fuses, close the disconnect with the outlets empty, and confirm about 120 V.
5. Plug in the refrigerator, then the CPAP, then the lights.
6. Plug the charger into a utility outlet, not into the inverter.

Torque each stud to the hardware listing. A loose DC lug is a fire source.

Parts and prices are in [BOM.md](BOM.md).
