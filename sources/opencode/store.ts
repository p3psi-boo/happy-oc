import { create } from 'zustand'
import type { Event, Permission, Project, Session, SessionStatus } from '@opencode-ai/sdk'
import { createProjectClient, createServerClient } from './client'
import {
    addServer,
    getActiveServerId,
    getServerById,
    getServers,
    removeServer,
    setActiveServerId,
    setServerLastProject,
    updateServer,
    type OpencodeProjectSelection,
    type OpencodeServer,
} from './storage'

export type OpencodeConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error'

type ServerHealth = {
    healthy: boolean
    version: string
}

type ServerProjectState = {
    server: OpencodeServer
    project: OpencodeProjectSelection
}

type ProjectState = {
    id: string
    worktree: string
    displayName: string
}

type SessionState = {
    id: string
    title: string
    directory: string
    updatedAt: number
    createdAt: number
    status: SessionStatus
    hasPendingPermissions: boolean
}

const SESSION_REFRESH_THROTTLE_MS = 1500

function toMillis(timestamp: number): number {
    return timestamp > 1_000_000_000_000 ? timestamp : timestamp * 1000
}

function displayNameFromWorktree(worktree: string): string {
    const normalized = worktree.replace(/\/+$/, '')
    const parts = normalized.split('/').filter(Boolean)
    return parts[parts.length - 1] || worktree
}

let sseAbortController: AbortController | null = null
let lastSessionRefreshAt = 0

export interface OpencodeStoreState {
    servers: OpencodeServer[]
    activeServerId: string | null
    activeProject: OpencodeProjectSelection | null

    projects: ProjectState[] | null
    sessions: SessionState[] | null

    connectionStatus: OpencodeConnectionStatus
    lastError: string | null
    lastEvent: Event | null
    lastEventCounter: number

    pendingPermissions: Record<string, Permission[]>

    reloadServers: () => void

    addServer: (fields: { baseUrl: string; name?: string }) => Promise<void>
    updateServer: (serverId: string, patch: Partial<Pick<OpencodeServer, 'name' | 'baseUrl'>>) => Promise<void>
    removeServer: (serverId: string) => Promise<void>
    setActiveServer: (serverId: string) => Promise<void>

    refreshProjects: () => Promise<void>
    setActiveProject: (project: ProjectState) => Promise<void>

    refreshSessions: (opts?: { force?: boolean }) => Promise<void>
    createSession: (opts: { title?: string }) => Promise<string | null>
    replyPermission: (opts: { sessionId: string; permissionId: string; response: 'once' | 'always' | 'reject' }) => Promise<void>

    connectEvents: () => Promise<void>
    disconnectEvents: () => void

    healthCheck: (serverId: string) => Promise<ServerHealth>
    getActiveContext: () => ServerProjectState | null
}

export const useOpencodeStore = create<OpencodeStoreState>()((set, get) => {
    const servers = getServers()
    const activeServerId = getActiveServerId()
    const activeServer = activeServerId ? getServerById(activeServerId) : null

    return {
        servers,
        activeServerId: activeServer?.id ?? null,
        activeProject: activeServer?.lastProject ?? null,

        projects: null,
        sessions: null,

        connectionStatus: 'disconnected',
        lastError: null,
        lastEvent: null,
        lastEventCounter: 0,
        pendingPermissions: {},

        reloadServers: () => {
            const nextServers = getServers()
            const nextActiveId = getActiveServerId()
            const nextActive = nextActiveId ? getServerById(nextActiveId) : null

            set({
                servers: nextServers,
                activeServerId: nextActive?.id ?? null,
                activeProject: nextActive?.lastProject ?? null,
            })
        },

        addServer: async (fields) => {
            const server = addServer(fields)
            setActiveServerId(server.id)
            get().reloadServers()

            set({ projects: null, sessions: null, lastError: null })
            await get().refreshProjects()
        },

        updateServer: async (serverId, patch) => {
            updateServer(serverId, patch)
            get().reloadServers()
        },

        removeServer: async (serverId) => {
            removeServer(serverId)
            get().reloadServers()
        },

        setActiveServer: async (serverId) => {
            setActiveServerId(serverId)
            get().reloadServers()

            set({ projects: null, sessions: null, lastError: null })

            await get().refreshProjects()

            const ctx = get().getActiveContext()
            if (ctx) {
                await get().connectEvents()
                await get().refreshSessions({ force: true })
            }
        },

        refreshProjects: async () => {
            const activeId = get().activeServerId
            if (!activeId) {
                set({ projects: [] })
                return
            }

            const server = getServerById(activeId)
            if (!server) {
                set({ lastError: 'Missing active server', projects: [] })
                return
            }

            set({ projects: null, lastError: null })

            try {
                const client = createServerClient(server.baseUrl)
                const response = await client.project.list({ throwOnError: true })
                const projects = (response as any).data as Project[]

                const projectState: ProjectState[] = projects
                    .map((p) => ({
                        id: p.id,
                        worktree: p.worktree,
                        displayName: displayNameFromWorktree(p.worktree),
                    }))
                    .sort((a, b) => a.displayName.localeCompare(b.displayName))

                set({ projects: projectState })

                const activeProject = get().activeProject
                if (activeProject && !projectState.some((p) => p.id === activeProject.id)) {
                    set({ activeProject: null })
                    setServerLastProject(server.id, null)
                    get().reloadServers()
                }
            } catch (error) {
                set({ projects: [], lastError: error instanceof Error ? error.message : 'Failed to load projects' })
            }
        },

        setActiveProject: async (project) => {
            const activeId = get().activeServerId
            if (!activeId) {
                return
            }

            const server = getServerById(activeId)
            if (!server) {
                return
            }

            const selection: OpencodeProjectSelection = { id: project.id, worktree: project.worktree }
            setServerLastProject(server.id, selection)
            get().reloadServers()

            set({ sessions: null, lastError: null })

            await get().connectEvents()
            await get().refreshSessions({ force: true })
        },

        refreshSessions: async (opts) => {
            const ctx = get().getActiveContext()
            if (!ctx) {
                set({ sessions: [] })
                return
            }

            const now = Date.now()
            if (!opts?.force && now - lastSessionRefreshAt < SESSION_REFRESH_THROTTLE_MS) {
                return
            }
            lastSessionRefreshAt = now

            try {
                const client = createProjectClient(ctx.server.baseUrl, ctx.project.worktree)

                const [sessionsResponse, statusResponse] = await Promise.all([
                    client.session.list({ throwOnError: true }),
                    client.session.status({ throwOnError: true }),
                ])

                const sessions = (sessionsResponse as any).data as Session[]
                const statusMap = (statusResponse as any).data as Record<string, SessionStatus>

                const pendingPermissions = get().pendingPermissions

                const mapped: SessionState[] = sessions
                    .map((s) => {
                        const status = statusMap[s.id] ?? { type: 'idle' as const }
                        return {
                            id: s.id,
                            title: s.title,
                            directory: s.directory,
                            createdAt: toMillis(s.time.created),
                            updatedAt: toMillis(s.time.updated),
                            status,
                            hasPendingPermissions: (pendingPermissions[s.id]?.length ?? 0) > 0,
                        }
                    })
                    .sort((a, b) => b.updatedAt - a.updatedAt)

                set({ sessions: mapped })
            } catch (error) {
                set({ sessions: [], lastError: error instanceof Error ? error.message : 'Failed to load sessions' })
            }
        },

        createSession: async (opts) => {
            const ctx = get().getActiveContext()
            if (!ctx) {
                return null
            }

            const client = createProjectClient(ctx.server.baseUrl, ctx.project.worktree)
            const response = await client.session.create({
                throwOnError: true,
                body: opts.title ? { title: opts.title } : {},
            })

            const session = (response as any).data as Session
            await get().refreshSessions({ force: true })
            return session.id
        },

        replyPermission: async ({ sessionId, permissionId, response }) => {
            const ctx = get().getActiveContext()
            if (!ctx) {
                return
            }

            const client = createProjectClient(ctx.server.baseUrl, ctx.project.worktree)
            await client.postSessionIdPermissionsPermissionId({
                throwOnError: true,
                path: { id: sessionId, permissionID: permissionId },
                body: { response },
            })

            set((state) => {
                const existing = state.pendingPermissions[sessionId] ?? []
                const nextList = existing.filter((p) => p.id !== permissionId)

                const nextPendingPermissions = { ...state.pendingPermissions }
                if (nextList.length === 0) {
                    delete nextPendingPermissions[sessionId]
                } else {
                    nextPendingPermissions[sessionId] = nextList
                }

                const nextSessions = state.sessions
                    ? state.sessions.map((s) =>
                          s.id === sessionId
                              ? { ...s, hasPendingPermissions: (nextPendingPermissions[sessionId]?.length ?? 0) > 0 }
                              : s,
                      )
                    : state.sessions

                return {
                    pendingPermissions: nextPendingPermissions,
                    sessions: nextSessions,
                }
            })
        },

        connectEvents: async () => {
            const ctx = get().getActiveContext()
            if (!ctx) {
                return
            }

            get().disconnectEvents()

            set((state) => ({
                pendingPermissions: {},
                sessions: state.sessions ? state.sessions.map((s) => ({ ...s, hasPendingPermissions: false })) : state.sessions,
            }))

            set({ connectionStatus: 'connecting', lastError: null })

            const client = createProjectClient(ctx.server.baseUrl, ctx.project.worktree)
            sseAbortController = new AbortController()
            const abortSignal = sseAbortController.signal

            try {
                const result = await client.event.subscribe({ signal: abortSignal })

                ;(async () => {
                    try {
                        for await (const payload of result.stream) {
                            if (abortSignal.aborted) {
                                break
                            }
                            const event = payload as Event
                            handleEvent(event)
                        }
                    } catch (error) {
                        if (!abortSignal.aborted) {
                            set({ connectionStatus: 'error', lastError: error instanceof Error ? error.message : 'SSE error' })
                        }
                    }
                })()
            } catch (error) {
                set({ connectionStatus: 'error', lastError: error instanceof Error ? error.message : 'Failed to connect' })
            }

            function handleEvent(event: Event) {
                set((state) => ({
                    lastEvent: event,
                    lastEventCounter: state.lastEventCounter + 1,
                }))

                if (event.type === 'server.connected') {
                    set({ connectionStatus: 'connected' })
                    void get().refreshSessions({ force: true })
                    return
                }

                if (event.type === 'session.created' || event.type === 'session.updated' || event.type === 'session.deleted') {
                    void get().refreshSessions()
                    return
                }

                if (event.type === 'session.status') {
                    const sessions = get().sessions
                    if (!sessions) {
                        return
                    }
                    set({
                        sessions: sessions.map((s) =>
                            s.id === event.properties.sessionID
                                ? { ...s, status: event.properties.status, updatedAt: Date.now() }
                                : s
                        ),
                    })
                    return
                }

                if (event.type === 'permission.updated') {
                    const permission = event.properties
                    set((state) => {
                        const sessionId = permission.sessionID
                        const existing = state.pendingPermissions[sessionId] ?? []
                        const alreadyPresent = existing.some((p) => p.id === permission.id)
                        const nextList = alreadyPresent ? existing : [permission, ...existing]

                        const nextPendingPermissions = {
                            ...state.pendingPermissions,
                            [sessionId]: nextList,
                        }

                        const nextSessions = state.sessions
                            ? state.sessions.map((s) =>
                                  s.id === sessionId ? { ...s, hasPendingPermissions: true } : s,
                              )
                            : state.sessions

                        return {
                            pendingPermissions: nextPendingPermissions,
                            sessions: nextSessions,
                        }
                    })
                    return
                }

                if (event.type === 'permission.replied') {
                    set((state) => {
                        const sessionId = event.properties.sessionID
                        const existing = state.pendingPermissions[sessionId] ?? []
                        const nextList = existing.filter((p) => p.id !== event.properties.permissionID)

                        const nextPendingPermissions = { ...state.pendingPermissions }
                        if (nextList.length === 0) {
                            delete nextPendingPermissions[sessionId]
                        } else {
                            nextPendingPermissions[sessionId] = nextList
                        }

                        const nextSessions = state.sessions
                            ? state.sessions.map((s) =>
                                  s.id === sessionId
                                      ? { ...s, hasPendingPermissions: (nextPendingPermissions[sessionId]?.length ?? 0) > 0 }
                                      : s,
                              )
                            : state.sessions

                        return {
                            pendingPermissions: nextPendingPermissions,
                            sessions: nextSessions,
                        }
                    })
                    return
                }

                if (event.type === 'message.updated' || event.type === 'message.part.updated') {
                    const now = Date.now()
                    if (now - lastSessionRefreshAt > SESSION_REFRESH_THROTTLE_MS) {
                        void get().refreshSessions()
                    }
                }
            }

        },

        disconnectEvents: () => {
            if (sseAbortController) {
                try {
                    sseAbortController.abort()
                } catch {
                    // noop
                }
                sseAbortController = null
            }
            set({ connectionStatus: 'disconnected' })
        },

        healthCheck: async (serverId) => {
            const server = getServerById(serverId)
            if (!server) {
                throw new Error('Server not found')
            }

            const client = createServerClient(server.baseUrl)
            await client.project.list({ throwOnError: true })

            return {
                healthy: true,
                version: 'unknown',
            }
        },

        getActiveContext: () => {
            const activeId = get().activeServerId
            if (!activeId) {
                return null
            }

            const server = getServerById(activeId)
            if (!server || !server.lastProject) {
                return null
            }

            return {
                server,
                project: server.lastProject,
            }
        },
    }
})
