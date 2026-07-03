/* Phase 0 capability spike for the Table–Spreadsheet unification plan (todo.md).
 * Runs scripted probes against @univerjs/preset-sheets-core 0.25.1 and dumps a
 * support matrix to window.__SPIKE__ + the #results div. Spike-branch only —
 * never shipped. Driven headlessly via browser automation.
 */
import { createUniver, defaultTheme, LocaleType, mergeLocales } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreEnUS from '@univerjs/preset-sheets-core/locales/en-US'
import { ICommandService, IUndoRedoService } from '@univerjs/core'
import '@univerjs/preset-sheets-core/lib/index.css'

/* eslint-disable @typescript-eslint/no-explicit-any */
const R: Record<string, unknown> = { startedAt: new Date().toISOString() }
const w = window as any
w.__SPIKE__ = R
w.__SPIKE_DONE__ = false

function render() {
  const el = document.getElementById('results')
  if (el) el.textContent = JSON.stringify(R, null, 2)
}
function log(key: string, value: unknown) {
  R[key] = value
  // eslint-disable-next-line no-console
  console.log(`[spike] ${key}:`, value)
  render()
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function sheetData(id: string, name: string, cellData: Record<number, Record<number, any>>) {
  return { id, name, rowCount: 200, columnCount: 26, cellData }
}

async function probe(name: string, fn: () => Promise<void>) {
  try {
    await fn()
  } catch (e) {
    log(`${name}.EXCEPTION`, String(e))
  }
}

async function main() {
  const container = document.getElementById('univer-container')!

  // ---- P0: boot -----------------------------------------------------------
  const t0 = performance.now()
  const { univer, univerAPI } = createUniver({
    locale: LocaleType.EN_US,
    locales: { [LocaleType.EN_US]: mergeLocales(UniverPresetSheetsCoreEnUS) },
    theme: defaultTheme,
    presets: [
      UniverSheetsCorePreset({
        container,
        // P5 static probe: the preset accepts menu/contextMenu config keys.
        menu: { 'sheet.menu.sheet-frozen': { hidden: true } },
        contextMenu: true,
      }),
    ],
  })
  const injector = (univer as any).__getInjector()
  const commandService = injector.get(ICommandService)
  const undoRedo = injector.get(IUndoRedoService)
  // Expose for interactive follow-up probes via browser automation.
  w.__univer = univer
  w.__univerAPI = univerAPI

  const fwb: any = univerAPI.createWorkbook({
    id: 'spikeWb',
    name: 'spike',
    sheetOrder: ['s1', 's2'],
    locale: 'enUS' as any,
    styles: {},
    sheets: {
      s1: sheetData('s1', 'Alpha', {
        0: { 0: { v: 1 }, 1: { v: 10 }, 2: { v: 100 } },
        1: { 0: { v: 2 }, 1: { v: 20 }, 2: { v: 200 } },
        2: { 0: { v: 3 }, 1: { v: 30 }, 2: { v: 300 } },
      }),
      s2: sheetData('s2', 'Beta', {
        0: { 0: { v: 1 } },
        1: { 0: { v: 2 } },
        2: { 0: { v: 3 } },
        3: { 0: { v: 4 } },
        4: { 0: { v: 5 } },
      }),
    },
  } as any)
  log('P0.boot_ms', Math.round(performance.now() - t0))
  log('P0.menu_config_accepted', true) // would have thrown at createUniver otherwise

  // Command log for P3/P4: record every executed command id.
  const commandLog: { id: string; t: number }[] = []
  univerAPI.addEvent((univerAPI as any).Event.CommandExecuted, (cmd: any) => {
    commandLog.push({ id: cmd.id, t: performance.now() })
  })

  const alpha = fwb.getSheetByName('Alpha')
  const beta = fwb.getSheetByName('Beta')

  // ---- P1: range protection (facade) --------------------------------------
  await probe('P1', async () => {
    const perm = alpha.getRange('C1:C5').getRangePermission()
    log('P1.facade_present', typeof perm?.protect === 'function')
    const rule = await perm.protect({ name: 'locked-result-col' })
    log('P1.protect_resolved', !!rule)
    log('P1.isProtected', alpha.getRange('C2').getRangePermission().isProtected())

    // Does protection block a *command-level* write (the path UI edits take)?
    const before = alpha.getRange('C2').getValue()
    let cmdResult: unknown
    let cmdError: string | null = null
    try {
      cmdResult = await commandService.executeCommand('sheet.command.set-range-values', {
        unitId: 'spikeWb',
        subUnitId: 's1',
        range: { startRow: 1, endRow: 1, startColumn: 2, endColumn: 2 },
        value: { v: 99999 },
      })
    } catch (e) {
      cmdError = String(e)
    }
    const after = alpha.getRange('C2').getValue()
    log('P1.protected_command_write', { before, after, cmdResult, cmdError, blocked: before === after })

    // Does a *facade* write bypass protection (materializer write-back path)?
    let facadeError: string | null = null
    try {
      alpha.getRange('C3').setValue(77777)
    } catch (e) {
      facadeError = String(e)
    }
    log('P1.protected_facade_write', {
      value: alpha.getRange('C3').getValue(),
      facadeError,
      bypassed: alpha.getRange('C3').getValue() === 77777,
    })

    // The default rule only restricts NON-owners; the local session is the
    // owner. Explicitly deny the Edit permission point and retry.
    const pointEnum =
      (univerAPI as any).Enum?.RangePermissionPoint ?? { Edit: 'Edit', View: 'View' }
    let setPointError: string | null = null
    try {
      await rule.setPoint(pointEnum.Edit, false)
    } catch (e) {
      setPointError = String(e)
    }
    const beforeDeny = alpha.getRange('C4').getValue()
    let denyCmdResult: unknown
    let denyCmdError: string | null = null
    try {
      denyCmdResult = await commandService.executeCommand('sheet.command.set-range-values', {
        unitId: 'spikeWb',
        subUnitId: 's1',
        range: { startRow: 3, endRow: 3, startColumn: 2, endColumn: 2 },
        value: { v: 88888 },
      })
    } catch (e) {
      denyCmdError = String(e)
    }
    log('P1.setPoint_deny_edit', {
      setPointError,
      pointEnumAvailable: !!(univerAPI as any).Enum?.RangePermissionPoint,
      beforeDeny,
      afterDeny: alpha.getRange('C4').getValue(),
      denyCmdResult,
      denyCmdError,
      blocked: alpha.getRange('C4').getValue() === beforeDeny,
    })
  })

  // ---- P2: undo-stack cleanliness on writes spanning protected cells ------
  await probe('P2', async () => {
    const top0 = undoRedo.pitchTopUndoElement()
    // Mixed write B1:C2 — B editable, C protected (the "paste across boundary" shape).
    let mixedError: string | null = null
    let mixedResult: unknown
    try {
      mixedResult = await commandService.executeCommand('sheet.command.set-range-values', {
        unitId: 'spikeWb',
        subUnitId: 's1',
        range: { startRow: 0, endRow: 1, startColumn: 1, endColumn: 2 },
        value: {
          0: { 1: { v: 1111 }, 2: { v: 2222 } },
          1: { 1: { v: 3333 }, 2: { v: 4444 } },
        },
      })
    } catch (e) {
      mixedError = String(e)
    }
    const top1 = undoRedo.pitchTopUndoElement()
    const b1 = alpha.getRange('B1').getValue()
    const c1 = alpha.getRange('C1').getValue()
    log('P2.mixed_write', {
      mixedResult,
      mixedError,
      b1_after: b1,
      c1_after: c1,
      undoPushed: top0 !== top1,
    })
    // If something was pushed, undo and check both cells revert coherently.
    if (top0 !== top1) {
      await fwb.undo()
      log('P2.after_undo', { b1: alpha.getRange('B1').getValue(), c1: alpha.getRange('C1').getValue() })
    }

    // onBeforeCommandExecute veto: throw to cancel, check value + undo stack.
    const topV0 = undoRedo.pitchTopUndoElement()
    const dispose = univerAPI.onBeforeCommandExecute((cmd: any) => {
      if (cmd.id === 'sheet.command.set-range-values') throw new Error('spike-veto')
    })
    let vetoError: string | null = null
    try {
      await alpha.getRange('A1').setValue(55555)
    } catch (e) {
      vetoError = String(e)
    }
    dispose.dispose()
    log('P2.veto', {
      vetoError,
      a1: alpha.getRange('A1').getValue(),
      valueUnchanged: alpha.getRange('A1').getValue() === 1,
      undoPushed: undoRedo.pitchTopUndoElement() !== topV0,
    })
  })

  // ---- P4: async formula completion + dependent-cell events ----------------
  await probe('P4', async () => {
    const ff = (univerAPI as any).getFormula()
    log('P4.formula_facade', {
      hasCalculationResultApplied: typeof ff?.calculationResultApplied === 'function',
      hasOnCalculationResultApplied: typeof ff?.onCalculationResultApplied === 'function',
      hasCalculationEnd: typeof ff?.calculationEnd === 'function',
    })

    // Value-changed events: does the *dependent* cell report a change?
    const valueChangedRanges: string[] = []
    const evDispose = univerAPI.addEvent((univerAPI as any).Event.SheetValueChanged, (p: any) => {
      try {
        const ranges = (p?.effectedRanges ?? []).map((r: any) =>
          typeof r?.getA1Notation === 'function' ? r.getA1Notation() : JSON.stringify(r?.getRange?.() ?? r),
        )
        valueChangedRanges.push(...ranges)
      } catch {
        valueChangedRanges.push('<unparsed>')
      }
    })

    beta.getRange('B1').setValue({ f: '=SUM(A1:A5)' })
    await ff.onCalculationResultApplied(4000)
    const initial = beta.getRange('B1').getValue()
    log('P4.initial_formula_value', initial) // expect 15

    // Edit upstream A1: 1 → 10; observe dependent recalc. setValue() is NOT
    // thenable in this facade version — it returns the FRange for chaining.
    commandLog.length = 0
    valueChangedRanges.length = 0
    const tEdit = performance.now()
    const staleProbe: { t: number; v: unknown }[] = []
    beta.getRange('A1').setValue(10)
    // Sample B1 synchronously right after the edit call (stale-window demo).
    staleProbe.push({ t: Math.round(performance.now() - tEdit), v: beta.getRange('B1').getValue() })
    await ff.onCalculationResultApplied(4000)
    const tDone = performance.now()
    staleProbe.push({ t: Math.round(tDone - tEdit), v: beta.getRange('B1').getValue() })
    await sleep(150) // let trailing events land
    log('P4.dependent_recalc', {
      b1_after_calc: beta.getRange('B1').getValue(), // expect 24
      stale_then_fresh: staleProbe,
      calc_gap_ms: Math.round(tDone - tEdit),
      command_ids_during_recalc: [...new Set(commandLog.map((c) => c.id))],
      value_changed_ranges: [...new Set(valueChangedRanges)],
    })
    evDispose.dispose()
  })

  // ---- P6: sheet ops + cross-sheet #REF! lifecycle -------------------------
  await probe('P6', async () => {
    const gamma = fwb.create('Gamma', 50, 10)
    gamma.getRange('A1').setValue(7)
    log('P6.create_sheet', !!fwb.getSheetByName('Gamma'))

    const renamed = typeof gamma.setName === 'function' ? (gamma.setName('GammaRenamed'), true) : false
    log('P6.rename_api', { renamed, found: !!fwb.getSheetByName('GammaRenamed') })

    const ff = (univerAPI as any).getFormula()
    alpha.getRange('D1').setValue({ f: '=GammaRenamed!A1' })
    await ff.onCalculationResultApplied(4000)
    log('P6.cross_sheet_value', alpha.getRange('D1').getValue()) // expect 7

    let deletedEvent = false
    const dDispose = univerAPI.addEvent((univerAPI as any).Event.SheetDeleted, () => {
      deletedEvent = true
    })
    const delOk = fwb.deleteSheet(fwb.getSheetByName('GammaRenamed'))
    await sleep(100)
    try {
      await ff.onCalculationResultApplied(3000)
    } catch {
      /* timeout acceptable */
    }
    let refValue: unknown
    let refError: string | null = null
    try {
      refValue = alpha.getRange('D1').getValue()
    } catch (e) {
      refError = String(e)
    }
    let refCell: unknown
    try {
      refCell = alpha.getRange('D1').getCellData()
    } catch (e) {
      refCell = String(e)
    }
    dDispose.dispose()
    log('P6.after_delete', { delOk, deletedEvent, refValue, refError, refCell })
  })

  // ---- P7: perf sanity — 10 sheets × 1k rows × 8 cols ----------------------
  await probe('P7', async () => {
    const sheets: Record<string, unknown> = {}
    const order: string[] = []
    for (let s = 0; s < 10; s++) {
      const cellData: Record<number, Record<number, any>> = {}
      for (let r = 0; r < 1000; r++) {
        const row: Record<number, any> = {}
        for (let c = 0; c < 8; c++) row[c] = { v: r * 8 + c }
        cellData[r] = row
      }
      const id = `p${s}`
      order.push(id)
      sheets[id] = { id, name: `Perf${s}`, rowCount: 1100, columnCount: 12, cellData }
    }
    const tCreate = performance.now()
    const perfWb: any = univerAPI.createWorkbook({
      id: 'perfWb', name: 'perf', sheetOrder: order, locale: 'enUS', styles: {}, sheets,
    } as any)
    const createMs = Math.round(performance.now() - tCreate)

    const sh5 = perfWb.getSheetByName('Perf5')
    const tEdit = performance.now()
    await sh5.getRange('A1').setValue(-1)
    const editMs = Math.round(performance.now() - tEdit)

    const tRead = performance.now()
    const values = sh5.getRange('A1:H1000').getValues()
    const readMs = Math.round(performance.now() - tRead)
    log('P7.perf', { create_10x1000x8_ms: createMs, single_edit_ms: editMs, read_8000_cells_ms: readMs, read_ok: values.length === 1000 })
  })

  log('finishedAt', new Date().toISOString())
  w.__SPIKE_DONE__ = true
  render()
}

main().catch((e) => {
  log('FATAL', String(e))
  w.__SPIKE_DONE__ = true
})
