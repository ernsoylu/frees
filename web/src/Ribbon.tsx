// Phase O: the ribbon. Permanent tabs (Home · Insert · Data · Analysis · View ·
// Help) and the focused window's contextual tab (Table, Plot or Digitizer), all
// built from the command registry. Expanded, compact or collapsed (a tab click
// then peeks the panel over the workspace); double-click a tab or press
// Ctrl+F1 to collapse or expand. Group labels name `role="group"` regions,
// arrow keys move within the panel, and overflow scrolls behind chevrons.
//
// It imports nothing heavy: no Plotly, no analysis dialog (AC-13).
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react'
import { ActionIcon, Button, Menu, Stack, Tabs, Text, Tooltip, UnstyledButton, VisuallyHidden } from '@mantine/core'
import { IconChevronDown, IconChevronLeft, IconChevronRight } from '@tabler/icons-react'
import { CONTEXT_TABS, keyLabel, RIBBON_TABS, type Command, type Commands, type RibbonTab } from './commands'
import type { RibbonDensity } from './ribbonPrefs'

export type RibbonContext = keyof typeof CONTEXT_TABS

/** A command button with a rich tooltip, linked to the button by `aria-describedby`. */
export function RibbonButton({ cmd, density, onRan }: Readonly<{ cmd: Command; density: RibbonDensity | 'icon'; onRan?: () => void }>) {
  const descId = useId()
  const Ico = cmd.icon
  const keys = cmd.shortcut?.map(keyLabel).join('+')
  const unavailable = cmd.unavailable
  const run = () => {
    if (unavailable) return
    cmd.run()
    onRan?.()
  }
  const common = {
    'data-ribbon-item': true,
    'data-disabled': unavailable ? true : undefined,
    'aria-disabled': unavailable ? true : undefined,
    'aria-describedby': descId,
    'aria-pressed': cmd.toggle ? cmd.checked === true : undefined,
    onClick: run,
  }
  const tip = (
    <Stack gap={2} maw={260}>
      <Text size="xs" fw={700}>{cmd.label}</Text>
      {cmd.description && <Text size="xs">{cmd.description}</Text>}
      {keys && <Text size="xs" c="dimmed">Shortcut: {keys}</Text>}
      {unavailable && <Text size="xs" c="yellow.4">Unavailable: {unavailable}</Text>}
    </Stack>
  )
  const described = [cmd.description, keys && `Shortcut ${keys}`, unavailable && `Unavailable: ${unavailable}`].filter(Boolean).join('. ')
  const variant = cmd.toggle && cmd.checked ? 'light' : 'subtle'
  let body
  if (density === 'icon') {
    body = (
      <ActionIcon {...common} variant="subtle" color="gray" aria-label={cmd.label}>
        <Ico size={16} />
      </ActionIcon>
    )
  } else if (density === 'compact') {
    body = (
      <Button {...common} size="compact-xs" variant={variant} color={cmd.toggle && cmd.checked ? 'teal' : 'gray'} leftSection={<Ico size={14} />}>
        {cmd.label}
      </Button>
    )
  } else {
    body = (
      <UnstyledButton
        {...common}
        className="frees-ribbon-tall"
        style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 6px',
          minWidth: 56, maxWidth: 92, borderRadius: 'var(--mantine-radius-sm)',
          opacity: unavailable ? 0.45 : 1, cursor: unavailable ? 'not-allowed' : 'pointer',
          background: cmd.toggle && cmd.checked ? 'var(--mantine-color-teal-light)' : undefined,
        }}
      >
        <Ico size={20} stroke={1.6} />
        <Text size="11px" lh={1.15} ta="center" style={{ overflowWrap: 'anywhere' }}>{cmd.label}</Text>
      </UnstyledButton>
    )
  }
  return (
    <>
      <Tooltip label={tip} openDelay={350} withArrow multiline>
        {body}
      </Tooltip>
      {described && <VisuallyHidden id={descId}>{described}</VisuallyHidden>}
    </>
  )
}

function moveFocus(e: KeyboardEvent<HTMLDivElement>) {
  const keys = ['ArrowLeft', 'ArrowRight', 'Home', 'End']
  if (!keys.includes(e.key)) return
  const items = [...e.currentTarget.querySelectorAll<HTMLElement>('[data-ribbon-item]')]
  const at = items.indexOf(document.activeElement as HTMLElement)
  if (at < 0) return
  e.preventDefault()
  const next = e.key === 'Home' ? 0 : e.key === 'End' ? items.length - 1 : (at + (e.key === 'ArrowRight' ? 1 : -1) + items.length) % items.length
  items[next].focus()
}

function RibbonPanel({ tab, commands, density, note, onRan }: Readonly<{ tab: RibbonTab; commands: Commands; density: RibbonDensity; note?: string | null; onRan?: () => void }>) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [overflow, setOverflow] = useState({ left: false, right: false })
  const baseId = useId()
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const measure = () => setOverflow({ left: el.scrollLeft > 0, right: el.scrollLeft + el.clientWidth < el.scrollWidth - 1 })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    el.addEventListener('scroll', measure, { passive: true })
    return () => {
      ro.disconnect()
      el.removeEventListener('scroll', measure)
    }
  }, [tab.id, density])
  const scroll = (dx: number) => scrollRef.current?.scrollBy({ left: dx, behavior: 'smooth' })
  const itemDensity = density === 'collapsed' ? 'expanded' : density
  return (
    <div style={{ display: 'flex', alignItems: 'stretch', minWidth: 0 }}>
      {overflow.left && (
        <ActionIcon variant="subtle" color="gray" h="auto" aria-label="Scroll ribbon left" onClick={() => scroll(-240)}>
          <IconChevronLeft size={14} />
        </ActionIcon>
      )}
      <div ref={scrollRef} onKeyDown={moveFocus} style={{ display: 'flex', alignItems: 'stretch', overflowX: 'auto', scrollbarWidth: 'none', flex: 1, minWidth: 0 }}>
        {note && (
          <Text size="xs" c="dimmed" px="sm" style={{ alignSelf: 'center', whiteSpace: 'nowrap' }}>
            {note}
          </Text>
        )}
        {tab.groups.map((g, gi) => {
          const labelId = `${baseId}-g${gi}`
          return (
            <div
              key={g.label}
              role="group"
              aria-labelledby={labelId}
              style={{
                display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flexShrink: 0,
                padding: '2px 6px', borderRight: '1px solid var(--mantine-color-default-border)',
              }}
            >
              <div style={{ display: 'flex', gap: 2, alignItems: density === 'compact' ? 'center' : 'flex-start', flexWrap: density === 'compact' ? 'wrap' : 'nowrap', maxWidth: density === 'compact' ? 420 : undefined }}>
                {g.items.map((id) => (
                  <RibbonButton key={id} cmd={commands[id]} density={itemDensity} onRan={onRan} />
                ))}
              </div>
              <Text id={labelId} size="10px" c="dimmed" ta="center" mt={2} style={{ whiteSpace: 'nowrap' }}>
                {g.label}
              </Text>
            </div>
          )
        })}
      </div>
      {overflow.right && (
        <ActionIcon variant="subtle" color="gray" h="auto" aria-label="Scroll ribbon right" onClick={() => scroll(240)}>
          <IconChevronRight size={14} />
        </ActionIcon>
      )}
    </div>
  )
}

export function Ribbon({ commands, context, contextNote, density, onDensityChange }: Readonly<{
  commands: Commands
  context: RibbonContext | null
  contextNote?: string | null
  density: RibbonDensity
  onDensityChange: (d: RibbonDensity) => void
}>) {
  const tabs = context ? [...RIBBON_TABS, CONTEXT_TABS[context]] : RIBBON_TABS
  const [chosen, setChosen] = useState('home')
  // A contextual tab that went away (its window lost focus) falls back to Home,
  // and stays there when the window is focused again: focusing never switches tabs.
  if (!tabs.some((t) => t.id === chosen)) setChosen('home')
  const current = tabs.find((t) => t.id === chosen) ?? tabs[0]
  const [peek, setPeek] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const collapsed = density === 'collapsed'
  // Ctrl+F1 and double-click are one command, so App keeps the density to return to.
  const toggleCollapsed = () => {
    setPeek(false)
    commands['view.ribbon'].run()
  }

  useEffect(() => {
    if (!peek) return
    const close = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setPeek(false)
    }
    const esc = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') setPeek(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', esc)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', esc)
    }
  }, [peek])

  const panel = (t: RibbonTab) => (
    <RibbonPanel tab={t} commands={commands} density={density} note={t.id.startsWith('ctx-') ? contextNote : null} onRan={collapsed ? () => setPeek(false) : undefined} />
  )

  return (
    <div ref={rootRef} style={{ position: 'relative' }} data-testid="ribbon" data-density={density}>
      <Tabs
        value={current.id}
        onChange={(v) => v && setChosen(v)}
        variant="default"
        keepMounted={false}
        styles={{ list: { flexWrap: 'nowrap', overflowX: 'auto', scrollbarWidth: 'none' } }}
      >
        <Tabs.List aria-label="Ribbon">
          {tabs.map((t) => (
            <Tabs.Tab
              key={t.id}
              value={t.id}
              py={4}
              px="sm"
              c={t.id.startsWith('ctx-') ? 'teal.4' : undefined}
              onClick={() => {
                if (collapsed) setPeek((p) => !(p && t.id === current.id))
              }}
              onDoubleClick={toggleCollapsed}
            >
              {t.label}
            </Tabs.Tab>
          ))}
          <Menu position="bottom-end" shadow="md">
            <Menu.Target>
              <ActionIcon variant="subtle" color="gray" size="sm" ml="auto" style={{ alignSelf: 'center' }} aria-label="Ribbon display options">
                <IconChevronDown size={14} />
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              <Menu.Label>Ribbon</Menu.Label>
              {(['expanded', 'compact', 'collapsed'] as const).map((d) => (
                <Menu.Item key={d} onClick={() => { setPeek(false); onDensityChange(d) }} rightSection={d === density ? '✓' : undefined}>
                  {d === 'expanded' ? 'Expanded' : d === 'compact' ? 'Compact' : 'Collapsed (click a tab to peek)'}
                </Menu.Item>
              ))}
            </Menu.Dropdown>
          </Menu>
        </Tabs.List>
        {tabs.map((t) => (
          <Tabs.Panel
            key={t.id}
            value={t.id}
            style={
              collapsed
                ? peek
                  ? {
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
                      background: 'var(--mantine-color-body)', border: '1px solid var(--mantine-color-default-border)',
                      borderRadius: 'var(--mantine-radius-md)', boxShadow: 'var(--mantine-shadow-md)',
                    }
                  : { display: 'none' }
                : undefined
            }
          >
            {panel(t)}
          </Tabs.Panel>
        ))}
      </Tabs>
    </div>
  )
}
