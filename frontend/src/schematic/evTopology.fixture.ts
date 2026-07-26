// Connection topology of the shipped EV thermal-management example, captured
// from /api/check. This is roadmap item 9's acceptance case: a real
// two-loop network (coolant + refrigerant, with a heat-domain radiator
// bank), 25 connections over 26 instances, including 3 junction nodes.
import type { Connection } from './layout'

export const EV_TOPOLOGY: Connection[] = [
  { domain: 'fluid', endpoints: ['pumpin.out', 'pump.in'] },
  { domain: 'fluid', endpoints: ['pump.out', 'obat.in', 'omot.in'] },
  { domain: 'fluid', endpoints: ['obat.out', 'bcp.in'] },
  { domain: 'heat', endpoints: ['bcp.wall', 'batt.port'] },
  { domain: 'fluid', endpoints: ['bcp.out', 'chlc.in'] },
  { domain: 'fluid', endpoints: ['chlc.out', 'mix.in1'] },
  { domain: 'fluid', endpoints: ['omot.out', 'mcp.in'] },
  { domain: 'heat', endpoints: ['mcp.wall', 'motor.port'] },
  { domain: 'fluid', endpoints: ['mcp.out', 'mix.in2'] },
  { domain: 'fluid', endpoints: ['mix.out', 'rad1.in'] },
  { domain: 'fluid', endpoints: ['rad1.out', 'or1.in'] },
  { domain: 'fluid', endpoints: ['or1.out', 'rad2.in'] },
  { domain: 'fluid', endpoints: ['rad2.out', 'or2.in'] },
  { domain: 'fluid', endpoints: ['or2.out', 'rad3.in'] },
  { domain: 'fluid', endpoints: ['rad3.out', 'or3.in'] },
  { domain: 'fluid', endpoints: ['or3.out', 'pumpout.in'] },
  { domain: 'heat', endpoints: ['amb.port', 'rad1.wall', 'rad2.wall', 'rad3.wall'] },
  { domain: 'fluid', endpoints: ['feed.out', 'chlr.in', 'cabe.in'] },
  { domain: 'fluid', endpoints: ['chlr.out', 'suc.in1'] },
  { domain: 'fluid', endpoints: ['cabe.out', 'suc.in2'] },
  { domain: 'fluid', endpoints: ['suc.out', 'cmp.in'] },
  { domain: 'fluid', endpoints: ['cmp.out', 'cond.in'] },
  { domain: 'fluid', endpoints: ['cond.out', 'liq.in'] },
  { domain: 'heat', endpoints: ['cabe.wall', 'cabin.port'] },
  { domain: 'heat', endpoints: ['chlr.wall', 'chlc.wall'] },
]
