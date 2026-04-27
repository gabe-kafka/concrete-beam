# concrete-beam

ACI 318 design for rectangular doubly-reinforced concrete beams. Designed
to plug into the statics solver loop:

```
FEA solve  ──►  V(x), M(x) per member  ──►  cracked-section design
   ▲                                              │
   └──────  updated EI, As, h  ◄──────────────────┘
```

## Scope

Given `{b, h, f'c, fy, layers}`, return:

- `ΦMn` — design moment capacity
- `Icr`, `EIeff` — cracked-section stiffness for next FEA pass
- `As_required(M_u)` — steel area to satisfy a demand moment
- ACI 318 cover, spacing, and ρ_min/ρ_max checks

## Status

Empty repo. First milestone: TypeScript port of the existing Streamlit
prototype at
[gabe-kafka/doubly-reinforced-concrete-beam](https://github.com/gabe-kafka/doubly-reinforced-concrete-beam),
exposed as a pure module (no UI) so it can be called from the statics
web app or any other tool.
