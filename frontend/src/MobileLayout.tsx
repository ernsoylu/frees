import { useState, ReactNode } from 'react'
import { Flex, Group, Title, UnstyledButton, Text, Box, Paper, ActionIcon, Menu } from '@mantine/core'
import {
  IconMathFunction,
  IconVariable,
  IconCode,
  IconTable,
  IconSettings,
  IconDeviceFloppy,
  IconTargetArrow,
  IconChecks
} from '@tabler/icons-react'
import { TableSpec } from './tables'

interface MobileLayoutProps {
  panelContent: Record<string, ReactNode>
  tables: TableSpec[]
  projectName: string
  checking: boolean
  solving: boolean
  solvable: boolean
  onCheck: () => void
  onSolve: () => void
  onSaveProject: () => void
  onPreferences: () => void
}

export default function MobileLayout({
  panelContent,
  tables,
  projectName,
  checking,
  solving,
  solvable,
  onCheck,
  onSolve,
  onSaveProject,
  onPreferences,
}: MobileLayoutProps) {
  const [activeTab, setActiveTab] = useState<'equations' | 'workspace' | 'terminal' | 'table'>('equations')
  const [activeTableId, setActiveTableId] = useState<string | null>(tables.length > 0 ? tables[0].id : null)

  const TABS = [
    { id: 'equations', label: 'Equations', icon: IconMathFunction },
    { id: 'workspace', label: 'Variables', icon: IconVariable },
    { id: 'terminal', label: 'REPL', icon: IconCode },
    { id: 'table', label: 'Tables', icon: IconTable },
  ] as const

  let content: ReactNode = null
  if (activeTab === 'equations') content = panelContent['equations']
  if (activeTab === 'workspace') content = panelContent['workspace']
  if (activeTab === 'terminal') content = panelContent['terminal']
  if (activeTab === 'table') {
    if (tables.length === 0) {
      content = <Box p="md"><Text c="dimmed">No tables available.</Text></Box>
    } else {
      const tId = activeTableId ?? tables[0].id
      content = panelContent[`table:${tId}`] || <Box p="md"><Text c="dimmed">Table not found.</Text></Box>
    }
  }

  return (
    <Flex direction="column" h="100vh" style={{ overflow: 'hidden' }}>
      {/* Top Bar */}
      <Paper
        shadow="xs"
        p="sm"
        radius={0}
        style={{
          borderBottom: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'var(--mantine-color-body)',
          zIndex: 10
        }}
      >
        <Group justify="space-between" align="center">
          <div>
            <Title order={5} c="teal" lineClamp={1}>
              {projectName}
            </Title>
            <Text size="xs" c="dimmed">
              {activeTab === 'table' ? 'Tables' : TABS.find((t) => t.id === activeTab)?.label}
            </Text>
          </div>
          <Group gap="xs">
            <ActionIcon
              variant="light"
              color="teal"
              loading={checking}
              onClick={onCheck}
              title="Check (F4)"
            >
              <IconChecks size={18} />
            </ActionIcon>
            <ActionIcon
              variant="filled"
              color="teal"
              loading={solving}
              disabled={!solvable}
              onClick={onSolve}
              title="Solve (F2)"
            >
              <IconTargetArrow size={18} />
            </ActionIcon>
            <Menu position="bottom-end">
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray">
                  <IconSettings size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item
                  leftSection={<IconDeviceFloppy size={14} />}
                  onClick={onSaveProject}
                >
                  Save Project
                </Menu.Item>
                <Menu.Item
                  leftSection={<IconSettings size={14} />}
                  onClick={onPreferences}
                >
                  Preferences
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Group>
      </Paper>

      {/* Main Content Area */}
      <Box style={{ flex: 1, minHeight: 0, overflowY: 'auto' }} p="xs">
        {activeTab === 'table' && tables.length > 1 && (
          <Group gap="xs" mb="sm" style={{ overflowX: 'auto', flexWrap: 'nowrap' }}>
            {tables.map((t) => (
              <ActionIcon
                key={t.id}
                variant={activeTableId === t.id ? 'filled' : 'light'}
                color="teal"
                onClick={() => setActiveTableId(t.id)}
                size="lg"
                title={t.name}
              >
                <Text size="xs" fw={700}>
                  {t.name.slice(0, 2).toUpperCase()}
                </Text>
              </ActionIcon>
            ))}
          </Group>
        )}
        {content}
      </Box>

      {/* Bottom Navigation */}
      <Paper
        shadow="lg"
        radius={0}
        style={{
          borderTop: '1px solid var(--mantine-color-default-border)',
          backgroundColor: 'var(--mantine-color-body)',
        }}
      >
        <Group grow gap={0} align="center">
          {TABS.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <UnstyledButton
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '10px 0',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  color: isActive ? 'var(--mantine-color-teal-filled)' : 'var(--mantine-color-text)',
                  opacity: isActive ? 1 : 0.6,
                  transition: 'opacity 0.2s, color 0.2s',
                }}
              >
                <Box
                  p={6}
                  style={{
                    backgroundColor: isActive ? 'var(--mantine-color-teal-light)' : 'transparent',
                    borderRadius: '12px',
                    marginBottom: '4px',
                  }}
                >
                  <Icon size={22} stroke={isActive ? 2.5 : 1.5} />
                </Box>
                <Text size="0.65rem" fw={isActive ? 600 : 400}>
                  {tab.label}
                </Text>
              </UnstyledButton>
            )
          })}
        </Group>
      </Paper>
    </Flex>
  )
}
