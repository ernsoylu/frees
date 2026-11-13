// Phase O: Insert Function… — one searchable browser over the function
// catalogue's categories, with each entry's description, a sample call, Insert
// (the same snippet and caret logic as the Functions menu) and Open Reference.
import { useMemo, useState } from 'react'
import { Anchor, Badge, Button, Code, Group, Modal, NavLink, ScrollArea, Select, Stack, Text, TextInput } from '@mantine/core'
import { useMediaQuery } from '@mantine/hooks'
import { IconSearch } from '@tabler/icons-react'
import { FUNCTION_CATEGORIES } from './functionCatalog'
import { helpUrl } from './helpUrl'
import { ALL_CATEGORIES as ALL, referenceSlug, searchFunctions } from './functionSearch'

export default function FunctionBrowserModal({ onInsert, onClose }: Readonly<{ onInsert: (snippet: string) => void; onClose: () => void }>) {
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(ALL)
  const hits = useMemo(() => searchFunctions(query, category), [query, category])
  // On a phone the categories become a select above the results, which take the full width.
  const narrow = useMediaQuery('(max-width: 600px)') ?? false
  const categories = [ALL, ...FUNCTION_CATEGORIES.map((c) => c.category)]

  return (
    <Modal opened onClose={onClose} title="Insert Function" size="xl" centered fullScreen={narrow}>
      <Stack gap="sm">
        <TextInput
          data-autofocus
          placeholder="Search functions by name, purpose or example…"
          aria-label="Search functions"
          leftSection={<IconSearch size={14} />}
          value={query}
          onChange={(e) => setQuery(e.currentTarget.value)}
        />
        {narrow && (
          <Select aria-label="Function category" data={categories} value={category} onChange={(v) => v && setCategory(v)} allowDeselect={false} />
        )}
        <Group align="stretch" gap="sm" wrap="nowrap" mih={0}>
          {!narrow && (
            <ScrollArea h={420} w={220} type="auto" style={{ flexShrink: 0 }}>
              <nav aria-label="Function categories">
                {categories.map((c) => (
                  <NavLink key={c} label={c} active={c === category} onClick={() => setCategory(c)} py={4} />
                ))}
              </nav>
            </ScrollArea>
          )}
          <ScrollArea h={narrow ? 'calc(100dvh - 190px)' : 420} style={{ flex: 1, minWidth: 0 }} type="auto">
            <Stack gap="xs" role="list" aria-label={`${hits.length} functions`}>
              {hits.length === 0 && <Text size="sm" c="dimmed">No function matches “{query}”.</Text>}
              {hits.map(({ category: cat, item }) => {
                const slug = referenceSlug(item)
                return (
                  <Stack key={`${cat}-${item.label}`} gap={4} role="listitem" p="xs" style={{ border: '1px solid var(--mantine-color-default-border)', borderRadius: 'var(--mantine-radius-md)' }}>
                    <Group justify="space-between" wrap="wrap" gap="xs">
                      <Group gap="xs" wrap="nowrap" miw={0}>
                        <Text fw={600} size="sm" truncate="end">{item.label}</Text>
                        {category === ALL && <Badge size="xs" variant="light" color="gray">{cat}</Badge>}
                      </Group>
                      <Group gap="xs" wrap="nowrap">
                        {slug && (
                          <Anchor size="xs" href={helpUrl(`#refpage:${slug}`)} target="_blank">
                            Open Reference
                          </Anchor>
                        )}
                        <Button size="compact-xs" onClick={() => { onInsert(item.snippet); onClose() }} aria-label={`Insert ${item.label}`}>
                          Insert
                        </Button>
                      </Group>
                    </Group>
                    <Code fz="xs" style={{ alignSelf: 'flex-start' }}>{item.snippet.replace('$0', '')}</Code>
                    {item.description && <Text size="xs">{item.description}</Text>}
                    {item.usage && <Code block fz="xs">{item.usage}</Code>}
                  </Stack>
                )
              })}
            </Stack>
          </ScrollArea>
        </Group>
      </Stack>
    </Modal>
  )
}
