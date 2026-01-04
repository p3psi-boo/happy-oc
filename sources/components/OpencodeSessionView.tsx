import * as React from 'react'
import { Pressable, ScrollView, Text, View } from 'react-native'
import { Typography } from '@/constants/Typography'
import { Stack } from 'expo-router'
import { StyleSheet, useUnistyles } from 'react-native-unistyles'
import { MarkdownView } from '@/components/markdown/MarkdownView'
import { AgentInput } from '@/components/AgentInput'
import { CommandSuggestion, FileMentionSuggestion } from '@/components/AgentInputSuggestionView'
import { RoundButton } from '@/components/RoundButton'
import { t } from '@/text'
import { useOpencodeStore } from '@/opencode/store'
import { createProjectClient } from '@/opencode/client'
import type { Command, Message, Part, Permission, Session, TextPart, ToolPart } from '@opencode-ai/sdk'
import { layout } from '@/components/layout'
import { Modal } from '@/modal'
import { ModelPickerModal } from '@/modal/components/ModelPickerModal'

const EMPTY_PERMISSIONS: Permission[] = []

type DisplayMessage = {
    id: string
    messageId: string
    role: 'user' | 'assistant'
    createdAt: number
    variant: 'text' | 'tool'
    text: string
}

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    scrollContent: {
        paddingTop: 12,
        paddingBottom: 12,
    },
    contentContainer: {
        width: '100%',
        maxWidth: layout.maxWidth,
        alignSelf: 'center',
    },
    userMessageContainer: {
        maxWidth: '100%',
        flexDirection: 'column',
        alignItems: 'flex-end',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
    },
    userMessageBubble: {
        backgroundColor: theme.colors.userMessageBackground,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginBottom: 12,
        maxWidth: '100%',
    },
    agentMessageContainer: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 16,
        alignSelf: 'flex-start',
    },
    toolMessageContainer: {
        marginHorizontal: 16,
        marginBottom: 12,
        borderRadius: 12,
        backgroundColor: theme.colors.surface,
        paddingHorizontal: 12,
        paddingVertical: 8,
        alignSelf: 'stretch',
    },
    permissionsContainer: {
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 4,
    },
    permissionCard: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginBottom: 12,
    },
    permissionTitle: {
        color: theme.colors.text,
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
    },
    permissionButtonsRow: {
        flexDirection: 'row',
        gap: 8,
    },
    permissionButton: {
        flex: 1,
    },
}))

function toMillis(timestamp: number): number {
    return timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000
}

function extractText(parts: Part[]): string {
    const textParts = parts
        .filter((p) => p.type === 'text')
        .map((p) => (p as any).text as string)
        .filter(Boolean)

    return textParts.join('')
}

function toolPartToMarkdown(part: ToolPart): string {
    const state: any = part.state
    const status = state?.status || 'unknown'

    let body = ''
    if (status === 'completed') {
        body = state.output || ''
    } else if (status === 'error') {
        body = state.error || ''
    } else if (status === 'pending') {
        body = state.raw || JSON.stringify(state.input ?? {}, null, 2)
    } else if (status === 'running') {
        body = JSON.stringify(state.input ?? {}, null, 2)
    }

    const title = state?.title ? `${part.tool}: ${state.title}` : part.tool

    return `**${title}** (${status})\n\n\`\`\`\n${body}\n\`\`\``
}

export const OpencodeSessionView = React.memo((props: { sessionId: string }) => {
    const { theme } = useUnistyles()
    const styles = stylesheet

    const getActiveContext = useOpencodeStore((s) => s.getActiveContext)
    const lastEvent = useOpencodeStore((s) => s.lastEvent)
    const lastEventCounter = useOpencodeStore((s) => s.lastEventCounter)

    const pendingPermissionsFromStore = useOpencodeStore((s) => s.pendingPermissions[props.sessionId])
    const pendingPermissions = pendingPermissionsFromStore ?? EMPTY_PERMISSIONS
    const replyPermission = useOpencodeStore((s) => s.replyPermission)

    const connectionStatus = useOpencodeStore((s) => s.connectionStatus)
    const sessionStatus = useOpencodeStore((s) => s.sessions?.find((sess) => sess.id === props.sessionId)?.status ?? null)

    const [title, setTitle] = React.useState<string>(props.sessionId)
    const [messages, setMessages] = React.useState<DisplayMessage[] | null>(null)
    const [input, setInput] = React.useState('')
    const [isSending, setIsSending] = React.useState(false)

    const ctx = React.useMemo(() => getActiveContext(), [getActiveContext])

    const refresh = React.useCallback(async () => {
        if (!ctx) {
            setMessages([])
            return
        }

        const client = createProjectClient(ctx.server.baseUrl, ctx.project.worktree)

        const [sessionRes, messagesRes] = await Promise.all([
            client.session.get({ throwOnError: true, path: { id: props.sessionId } }),
            client.session.messages({ throwOnError: true, path: { id: props.sessionId } }),
        ])

        const session = (sessionRes as any).data as Session
        setTitle(session.title || props.sessionId)

        const list = (messagesRes as any).data as Array<{ info: Message; parts: Part[] }>

        const mapped: DisplayMessage[] = []

        for (const entry of list) {
            const createdAt = toMillis(entry.info.time.created)

            if (entry.info.role === 'user') {
                const text = extractText(entry.parts)
                if (text.trim().length > 0) {
                    mapped.push({
                        id: entry.info.id,
                        messageId: entry.info.id,
                        role: 'user',
                        createdAt,
                        variant: 'text',
                        text,
                    })
                }
                continue
            }

            for (const part of entry.parts) {
                if (part.type === 'text') {
                    const text = (part as TextPart).text ?? ''
                    if (text.length === 0) {
                        continue
                    }
                    mapped.push({
                        id: part.id,
                        messageId: (part as TextPart).messageID,
                        role: 'assistant',
                        createdAt,
                        variant: 'text',
                        text,
                    })
                    continue
                }

                if (part.type === 'tool') {
                    mapped.push({
                        id: part.id,
                        messageId: (part as ToolPart).messageID,
                        role: 'assistant',
                        createdAt,
                        variant: 'tool',
                        text: toolPartToMarkdown(part as ToolPart),
                    })
                    continue
                }

                // Ignore other part kinds for now
            }
        }

        setMessages(mapped)
    }, [ctx, props.sessionId])

    React.useEffect(() => {
        void refresh()
    }, [refresh])

    const messagesRef = React.useRef<DisplayMessage[] | null>(null)
    React.useEffect(() => {
        messagesRef.current = messages
    }, [messages])

    const refreshTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null)

    const cancelRefresh = React.useCallback(() => {
        if (refreshTimer.current) {
            clearTimeout(refreshTimer.current)
            refreshTimer.current = null
        }
    }, [])

    const scheduleRefresh = React.useCallback(
        (delayMs: number) => {
            if (refreshTimer.current) {
                clearTimeout(refreshTimer.current)
            }

            refreshTimer.current = setTimeout(() => {
                void refresh()
            }, delayMs)
        },
        [refresh],
    )

    React.useEffect(() => {
        return () => {
            if (refreshTimer.current) {
                clearTimeout(refreshTimer.current)
                refreshTimer.current = null
            }
        }
    }, [])

    const applyPartUpdate = React.useCallback((part: Part, delta?: string) => {
        if (part.type === 'text') {
            const textPart = part as TextPart
            setMessages((current) => {
                if (!current) {
                    return current
                }

                const index = current.findIndex((m) => m.id === textPart.id)
                const fallbackIndex =
                    index === -1 ? current.findIndex((m) => m.role === 'user' && m.id === textPart.messageID) : -1

                const resolvedIndex = index !== -1 ? index : fallbackIndex
                if (resolvedIndex === -1) {
                    return current
                }

                const existing = current[resolvedIndex]

                let nextText = textPart.text
                if (typeof delta === 'string' && delta.length > 0) {
                    if (textPart.text && textPart.text.startsWith(existing.text)) {
                        nextText = textPart.text
                    } else {
                        nextText = existing.text + delta
                    }
                }

                if (nextText === existing.text) {
                    return current
                }

                const next = [...current]
                next[index] = { ...existing, text: nextText }
                return next
            })
            return
        }

        if (part.type === 'tool') {
            const toolPart = part as ToolPart
            const rendered = toolPartToMarkdown(toolPart)

            setMessages((current) => {
                if (!current) {
                    return current
                }

                const index = current.findIndex((m) => m.id === toolPart.id)
                if (index === -1) {
                    return current
                }

                const existing = current[index]
                if (rendered === existing.text) {
                    return current
                }

                const next = [...current]
                next[index] = { ...existing, variant: 'tool', text: rendered }
                return next
            })
        }
    }, [])

    const insertPart = React.useCallback((part: Part, delta?: string) => {
        let inserted = false

        if (part.type === 'text') {
            const textPart = part as TextPart
            const nextText = textPart.text || (typeof delta === 'string' ? delta : '')

            if (nextText.trim().length === 0) {
                return false
            }

            setMessages((current) => {
                if (!current) {
                    return current
                }

                if (current.some((m) => m.id === textPart.id)) {
                    inserted = true
                    return current
                }

                const messageId = textPart.messageID
                const reference = current.find((m) => m.messageId === messageId)
                const role = reference?.role ?? 'assistant'

                const newMessage: DisplayMessage = {
                    id: textPart.id,
                    messageId,
                    role,
                    createdAt: Date.now(),
                    variant: 'text',
                    text: nextText,
                }

                let lastIndexForMessage: number | null = null
                for (let i = current.length - 1; i >= 0; i--) {
                    if (current[i].messageId === messageId) {
                        lastIndexForMessage = i
                        break
                    }
                }

                const next = [...current]
                if (lastIndexForMessage !== null) {
                    next.splice(lastIndexForMessage + 1, 0, newMessage)
                } else {
                    next.push(newMessage)
                }

                inserted = true
                return next
            })

            return inserted
        }

        if (part.type === 'tool') {
            const toolPart = part as ToolPart

            setMessages((current) => {
                if (!current) {
                    return current
                }

                if (current.some((m) => m.id === toolPart.id)) {
                    inserted = true
                    return current
                }

                const messageId = toolPart.messageID

                const newMessage: DisplayMessage = {
                    id: toolPart.id,
                    messageId,
                    role: 'assistant',
                    createdAt: Date.now(),
                    variant: 'tool',
                    text: toolPartToMarkdown(toolPart),
                }

                let lastIndexForMessage: number | null = null
                for (let i = current.length - 1; i >= 0; i--) {
                    if (current[i].messageId === messageId) {
                        lastIndexForMessage = i
                        break
                    }
                }

                const next = [...current]
                if (lastIndexForMessage !== null) {
                    next.splice(lastIndexForMessage + 1, 0, newMessage)
                } else {
                    next.push(newMessage)
                }

                inserted = true
                return next
            })

            return inserted
        }

        return false
    }, [])

    const removePart = React.useCallback((partId: string) => {
        setMessages((current) => (current ? current.filter((m) => m.id !== partId) : current))
    }, [])

    const removeMessage = React.useCallback((messageId: string) => {
        setMessages((current) => (current ? current.filter((m) => m.messageId !== messageId) : current))
    }, [])

    React.useEffect(() => {
        if (!lastEvent) {
            return
        }

        const isRelevant = (() => {
            if (lastEvent.type === 'message.updated') {
                return lastEvent.properties.info.sessionID === props.sessionId
            }
            if (lastEvent.type === 'message.part.updated') {
                return lastEvent.properties.part.sessionID === props.sessionId
            }
            if (lastEvent.type === 'message.removed' || lastEvent.type === 'message.part.removed') {
                return lastEvent.properties.sessionID === props.sessionId
            }
            return false
        })()

        if (!isRelevant) {
            return
        }

        if (lastEvent.type === 'message.updated') {
            const info = lastEvent.properties.info
            const current = messagesRef.current

            if (!current) {
                scheduleRefresh(250)
                return
            }

            const messageId = info.id
            const present =
                info.role === 'user'
                    ? current.some((m) => m.id === messageId)
                    : current.some((m) => m.messageId === messageId)

            if (present) {
                return
            }

            if (info.role === 'user') {
                scheduleRefresh(150)
            } else {
                scheduleRefresh(1200)
            }

            return
        }

        if (lastEvent.type === 'message.part.updated') {
            const part = lastEvent.properties.part
            const delta = lastEvent.properties.delta
            const current = messagesRef.current

            const hasPart = current?.some((m) => m.id === part.id) ?? false
            const canApplyToUserMessage =
                part.type === 'text' &&
                (current?.some((m) => m.role === 'user' && m.id === (part as TextPart).messageID) ?? false)

            if (hasPart || canApplyToUserMessage) {
                cancelRefresh()
                applyPartUpdate(part, delta)
                return
            }

            const inserted = insertPart(part, delta)
            if (inserted) {
                cancelRefresh()
                return
            }

            scheduleRefresh(150)
            return
        }

        if (lastEvent.type === 'message.part.removed') {
            const partId = lastEvent.properties.partID
            const exists = messagesRef.current?.some((m) => m.id === partId) ?? false

            if (exists) {
                cancelRefresh()
                removePart(partId)
                return
            }

            scheduleRefresh(150)
            return
        }

        if (lastEvent.type === 'message.removed') {
            cancelRefresh()
            removeMessage(lastEvent.properties.messageID)
            return
        }

        scheduleRefresh(250)
    }, [applyPartUpdate, cancelRefresh, insertPart, lastEvent, lastEventCounter, props.sessionId, removeMessage, removePart, scheduleRefresh])

    const modeOptions = ['Build', 'Plan'] as const
    const [selectedMode, setSelectedMode] = React.useState<'Build' | 'Plan'>('Build')
    const [selectedModel, setSelectedModel] = React.useState<string>('claude-3-5-sonnet-20241022')
    const [availableModels, setAvailableModels] = React.useState<{ id: string; name: string }[]>([])
    const [isModelPickerOpen, setIsModelPickerOpen] = React.useState(false)

    // Load available models
    React.useEffect(() => {
        if (!ctx) return
        ;(async () => {
            try {
                const client = createProjectClient(ctx.server.baseUrl, ctx.project.worktree)
                const configRes = await client.config.providers({ throwOnError: true })
                const providersData = (configRes as any).data as { providers: Array<{ id: string; name: string; models: Record<string, { id: string; name: string }> }> }
                
const models: { id: string; name: string }[] = []
                for (const provider of providersData.providers) {
                    for (const modelKey in provider.models) {
                        const model = provider.models[modelKey]
                        models.push({ id: `${provider.id}/${model.id}`, name: model.name || model.id })
                    }
                }
                // Add default if empty or not found, just in case
                 if (models.length === 0) {
                     models.push({ id: 'anthropic/claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' })
                     models.push({ id: 'openai/gpt-4o', name: 'GPT-4o' })
                 }
                setAvailableModels(models)
            } catch (e) {
                console.warn('Failed to load models', e)
                 setAvailableModels([
                     { id: 'anthropic/claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
                     { id: 'openai/gpt-4o', name: 'GPT-4o' }
                 ])
            }
        })()
    }, [ctx])


    const send = React.useCallback(async () => {
        if (!ctx || !input.trim() || isSending) {
            return
        }

        setIsSending(true)
        try {
            const client = createProjectClient(ctx.server.baseUrl, ctx.project.worktree)
            
            // Parse model selection
            let providerID = 'anthropic'
            let modelID = 'claude-3-5-sonnet-20241022'
            
            if (selectedModel.includes('/')) {
                const parts = selectedModel.split('/')
                providerID = parts[0]
                modelID = parts.slice(1).join('/')
            }

            await client.session.prompt({
                throwOnError: true,
                path: { id: props.sessionId },
                body: {
                    parts: [{ type: 'text', text: input.trim() }],
                    agent: selectedMode === 'Plan' ? 'plan' : 'build',
                    model: {
                        providerID,
                        modelID
                    }
                },
            })
            setInput('')
        } finally {
            setIsSending(false)
        }
    }, [ctx, input, isSending, props.sessionId, selectedMode, selectedModel])

    const abort = React.useCallback(async () => {
        if (!ctx) {
            return
        }
        const client = createProjectClient(ctx.server.baseUrl, ctx.project.worktree)
        await client.session.abort({ throwOnError: true, path: { id: props.sessionId } })
    }, [ctx, props.sessionId])


    const connectionIndicator = React.useMemo(() => {
        if (connectionStatus === 'connected') {
            return { text: t('status.connected'), color: '#34C759', dotColor: '#34C759', isPulsing: false }
        }
        if (connectionStatus === 'connecting') {
            return { text: t('status.connecting'), color: '#007AFF', dotColor: '#007AFF', isPulsing: true }
        }
        if (connectionStatus === 'error') {
            return { text: t('status.error'), color: '#FF3B30', dotColor: '#FF3B30', isPulsing: false }
        }
        return { text: t('status.disconnected'), color: '#FF9500', dotColor: '#FF9500', isPulsing: false }
    }, [connectionStatus])

    const autocompleteSuggestions = React.useCallback(
        async (query: string) => {
            if (!ctx) {
                return []
            }

            if (!query || query.length === 0) {
                return []
            }

            const client = createProjectClient(ctx.server.baseUrl, ctx.project.worktree)

            if (query.startsWith('/')) {
                const term = query.slice(1).toLowerCase()
                const response = await client.command.list({ throwOnError: true })
                const commands = (response as any).data as Command[]

                const filtered = term
                    ? commands.filter((c) => c.name.toLowerCase().includes(term)).slice(0, 6)
                    : commands.slice(0, 6)

                return filtered.map((cmd) => ({
                    key: `cmd-${cmd.name}`,
                    text: `/${cmd.name}`,
                    component: () =>
                        React.createElement(CommandSuggestion, {
                            command: cmd.name,
                            description: cmd.description,
                        }),
                }))
            }

            if (query.startsWith('@')) {
                const term = query.slice(1)
                const response = await client.find.files({
                    throwOnError: true,
                    query: {
                        query: term,
                        dirs: 'false',
                    },
                })

                const files = (response as any).data as string[]

                return files.slice(0, 6).map((fullPath) => {
                    const segments = fullPath.split('/')
                    const fileName = segments.pop() || fullPath
                    const filePath = segments.length ? segments.join('/') + '/' : ''

                    return {
                        key: `file-${fullPath}`,
                        text: `@${fullPath}`,
                        component: () =>
                            React.createElement(FileMentionSuggestion, {
                                fileName,
                                filePath,
                                fileType: 'file',
                            }),
                    }
                })
            }

            return []
        },
        [ctx],
    )

    return (
        <View style={styles.container}>
<Stack.Screen
                options={React.useMemo(
                    () => ({
                        headerShown: true,
                        headerTitle: () => (
                            <View style={{ alignItems: 'flex-start' }}>
                                <Text style={{ fontSize: 17, fontWeight: '600', color: theme.colors.text }}>{title}</Text>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 2 }}>
                                    <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: connectionIndicator.dotColor, marginRight: 4, opacity: connectionIndicator.isPulsing ? 0.6 : 1 }} />
                                    <Text style={{ fontSize: 12, color: theme.colors.textSecondary }}>{connectionIndicator.text}</Text>
                                </View>
                            </View>
                        ),
                        headerBackTitle: t('common.back'),
                    }),
                    [connectionIndicator.dotColor, connectionIndicator.isPulsing, connectionIndicator.text, theme.colors.text, theme.colors.textSecondary, title],
                )}
            />

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.contentContainer}>
                    {(messages ?? []).map((m) => {
                        if (m.role === 'user') {
                            return (
                                <View key={m.id} style={styles.userMessageContainer}>
                                    <View style={styles.userMessageBubble}>
                                        <MarkdownView markdown={m.text} />
                                    </View>
                                </View>
                            )
                        }

                        if (m.variant === 'tool') {
                            return (
                                <View key={m.id} style={styles.toolMessageContainer}>
                                    <MarkdownView markdown={m.text} />
                                </View>
                            )
                        }

                        return (
                            <View key={m.id} style={styles.agentMessageContainer}>
                                <MarkdownView markdown={m.text} />
                            </View>
                        )
                    })}
                </View>
            </ScrollView>

            <View style={{ backgroundColor: theme.colors.surface }}>
                {pendingPermissions.length > 0 ? (
                    <View style={styles.permissionsContainer}>
                        {pendingPermissions.map((p: Permission) => (
                            <View key={p.id} style={styles.permissionCard}>
                                <Text style={styles.permissionTitle} numberOfLines={2}>
                                    {p.title}
                                </Text>
                                <View style={styles.permissionButtonsRow}>
                                    <View style={styles.permissionButton}>
                                        <RoundButton
                                            size="normal"
                                            title={t('opencode.permissions.allowOnce')}
                                            action={() =>
                                                replyPermission({
                                                    sessionId: props.sessionId,
                                                    permissionId: p.id,
                                                    response: 'once',
                                                })
                                            }
                                        />
                                    </View>
                                    <View style={styles.permissionButton}>
                                        <RoundButton
                                            size="normal"
                                            title={t('opencode.permissions.allowAlways')}
                                            action={() =>
                                                replyPermission({
                                                    sessionId: props.sessionId,
                                                    permissionId: p.id,
                                                    response: 'always',
                                                })
                                            }
                                        />
                                    </View>
                                    <View style={styles.permissionButton}>
                                        <RoundButton
                                            size="normal"
                                            display="inverted"
                                            title={t('opencode.permissions.reject')}
                                            action={() =>
                                                replyPermission({
                                                    sessionId: props.sessionId,
                                                    permissionId: p.id,
                                                    response: 'reject',
                                                })
                                            }
                                        />
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                ) : null}

                <View style={styles.contentContainer}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, marginBottom: 8, paddingHorizontal: 16 }}>
                         <View style={{ flexDirection: 'row', backgroundColor: theme.colors.surfacePressed, borderRadius: 8, padding: 2 }}>
                            {modeOptions.map((mode) => (
                                <Pressable
                                    key={mode}
                                    onPress={() => setSelectedMode(mode as any)}
                                    style={{
                                        paddingHorizontal: 12,
                                        paddingVertical: 6,
                                        borderRadius: 6,
                                        backgroundColor: selectedMode === mode ? theme.colors.surface : 'transparent',
                                        shadowColor: selectedMode === mode ? theme.colors.shadow.color : 'transparent',
                                        shadowOpacity: selectedMode === mode ? 0.1 : 0,
                                        shadowRadius: 2,
                                        elevation: selectedMode === mode ? 1 : 0,
                                    }}
                                >
                                    <Text style={{ 
                                        ...Typography.default('semiBold'), 
                                        fontSize: 13,
                                        color: selectedMode === mode ? theme.colors.text : theme.colors.textSecondary 
                                    }}>
                                        {mode === 'Build' ? t('opencode.mode.build') : t('opencode.mode.plan')}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                        
                        <Pressable 
                            onPress={() => setIsModelPickerOpen(true)}
                            style={{ 
                                flexDirection: 'row', 
                                alignItems: 'center', 
                                backgroundColor: theme.colors.surfacePressed, 
                                borderRadius: 8, 
                                paddingHorizontal: 12, 
                                paddingVertical: 6 
                            }}
                        >
                            <Text style={{ ...Typography.default('regular'), fontSize: 13, color: theme.colors.textSecondary }}>
                                {availableModels.find(m => m.id === selectedModel)?.name || selectedModel}
                            </Text>
                        </Pressable>
                    </View>

                    <AgentInput
                        placeholder={t('session.inputPlaceholder')}
                        value={input}
                        onChangeText={setInput}
                        onSend={send}
                        isSending={isSending}
                        onAbort={abort}
                        showAbortButton={sessionStatus?.type === 'busy'}
                        connectionStatus={connectionIndicator}
                        autocompletePrefixes={['/', '@']}
                        autocompleteSuggestions={autocompleteSuggestions}
                    />
                </View>
                
                {isModelPickerOpen && (
                    <ModelPickerModal
                        models={availableModels}
                        selectedModelId={selectedModel}
                        onClose={() => setIsModelPickerOpen(false)}
                        onSelect={(modelId) => {
                            setSelectedModel(modelId)
                            setIsModelPickerOpen(false)
                        }}
                    />
                )}
            </View>
        </View>
    )
})
