import { useEffect } from 'react'
import { ActionIcon, Badge, Button, Group, Paper, Select, Slider, Stack, Text, Tooltip } from '@mantine/core'
import { useReducedMotion } from '@mantine/hooks'
import { IconPlayerPause, IconPlayerPlay, IconPlayerSkipBack, IconPlayerSkipForward, IconPlayerTrackNext, IconPlayerTrackPrev } from '@tabler/icons-react'
import { advance, timeAt, timeLabel, type Timeline } from './playback'

interface Props {
  timelines: Timeline[]
  timeline: Timeline
  onTimeline: (name: string) => void
  /** The sample shown; null shows the run's end without playback. */
  index: number | null
  playing: boolean
  speed: number
  /** Why playing is unavailable (the result is stale), or null. */
  unavailable: string | null
  onIndex: (k: number) => void
  onPlaying: (playing: boolean) => void
  onSpeed: (speed: number) => void
  onExit: () => void
  onExport: () => void
}

const SPEEDS = ['0.25', '0.5', '1', '2', '4']
const TICK_MS = 100

/**
 * RUN-05: recorded-result playback of a dynamic run. It moves through the
 * samples the solve recorded and never solves. Events are marked; a step or
 * jump lands on recorded samples only, so an event reads as the first sample
 * after it. Under reduced motion, step and scrub replace play.
 */
export default function PlaybackBar({ timelines, timeline: tl, onTimeline, index, playing, speed, unavailable, onIndex, onPlaying, onSpeed, onExit, onExport }: Readonly<Props>) {
  const reduced = useReducedMotion()
  const last = tl.times.length - 1
  const k = index ?? last
  const canPlay = !reduced && !unavailable

  useEffect(() => {
    if (!playing) return
    if (!canPlay || k >= last) {
      onPlaying(false)
      return
    }
    const id = setTimeout(() => onIndex(advance(tl, k, TICK_MS / 1000, speed)), TICK_MS)
    return () => clearTimeout(id)
  }, [playing, canPlay, k, last, tl, speed, onIndex, onPlaying])

  const before = tl.events.filter((e) => e.index < k).at(-1)
  const after = tl.events.find((e) => e.index > k)
  const here = tl.events.filter((e) => e.index === k)
  const go = (n: number) => {
    onPlaying(false)
    onIndex(Math.max(0, Math.min(last, n)))
  }

  return (
    <Paper withBorder p="xs" data-testid="playback-bar">
      <Stack gap={6}>
        <Group gap={6} wrap="wrap">
          <Text size="xs" fw={600}>Playback</Text>
          {timelines.length > 1 ? (
            <Select size="xs" w={130} aria-label="Recorded run" data={timelines.map((t) => t.table)} value={tl.table} onChange={(v) => v && onTimeline(v)} allowDeselect={false} comboboxProps={{ withinPortal: false }} />
          ) : (
            <Text size="xs" c="dimmed">{tl.table}</Text>
          )}
          <Text size="xs" data-testid="playback-time">{timeLabel(tl, k)} · sample {k + 1} of {tl.times.length}</Text>
          {here.map((e) => (
            <Badge key={e.name} size="xs" color="orange" variant="light" data-testid="playback-event">
              event {e.name} · {timeAt(tl, e.time)}
            </Badge>
          ))}
          {index === null && <Text size="xs" c="dimmed">end of run</Text>}
        </Group>
        <Group gap={4} wrap="wrap">
          <Tooltip label={before ? `Previous event: ${before.name}` : 'No earlier event'}>
            <ActionIcon size="sm" variant="subtle" aria-label="Previous event" disabled={!before} onClick={() => before && go(before.index)}><IconPlayerSkipBack size={14} /></ActionIcon>
          </Tooltip>
          <ActionIcon size="sm" variant="subtle" aria-label="Step back" disabled={k <= 0} onClick={() => go(k - 1)}><IconPlayerTrackPrev size={14} /></ActionIcon>
          {playing ? (
            <ActionIcon size="sm" variant="light" aria-label="Pause" onClick={() => onPlaying(false)}><IconPlayerPause size={14} /></ActionIcon>
          ) : (
            <Tooltip label={unavailable ?? (reduced ? 'Reduced motion is on: step or scrub instead' : 'Play the recorded run')}>
              <ActionIcon
                size="sm"
                variant="light"
                aria-label="Play"
                disabled={!canPlay}
                onClick={() => {
                  if (k >= last) onIndex(0)
                  onPlaying(true)
                }}
              >
                <IconPlayerPlay size={14} />
              </ActionIcon>
            </Tooltip>
          )}
          <ActionIcon size="sm" variant="subtle" aria-label="Step forward" disabled={k >= last} onClick={() => go(k + 1)}><IconPlayerTrackNext size={14} /></ActionIcon>
          <Tooltip label={after ? `Next event: ${after.name}` : 'No later event'}>
            <ActionIcon size="sm" variant="subtle" aria-label="Next event" disabled={!after} onClick={() => after && go(after.index)}><IconPlayerSkipForward size={14} /></ActionIcon>
          </Tooltip>
          <Select size="xs" w={80} aria-label="Speed" data={SPEEDS.map((s) => ({ value: s, label: `${s}×` }))} value={String(speed)} onChange={(v) => v && onSpeed(Number(v))} allowDeselect={false} comboboxProps={{ withinPortal: false }} />
          <Button size="compact-xs" variant="light" onClick={onExport}>Export values at {timeLabel(tl, k)}</Button>
          {index !== null && <Button size="compact-xs" variant="subtle" color="gray" onClick={onExit}>Exit playback</Button>}
        </Group>
        <Slider
          size="sm"
          thumbLabel="Recorded time"
          min={0}
          max={last}
          step={1}
          value={k}
          label={(v) => timeLabel(tl, v)}
          marks={tl.events.map((e) => ({ value: e.index, label: e.name }))}
          onChange={go}
          mb={tl.events.length ? 14 : 0}
        />
        {reduced && <Text size="xs" c="dimmed">Reduced motion is on: playback steps and scrubs without animating.</Text>}
        {unavailable && <Text size="xs" c="orange" data-testid="playback-unavailable">{unavailable}</Text>}
        {tl.stopped && <Text size="xs" c="dimmed">A stop event ended this run at {timeLabel(tl, last)}.</Text>}
      </Stack>
    </Paper>
  )
}
