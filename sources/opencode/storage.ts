import { MMKV } from 'react-native-mmkv'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'

const opencodeStorage = new MMKV({ id: 'opencode-config' })

const SERVERS_KEY = 'opencode-servers'
const ACTIVE_SERVER_ID_KEY = 'opencode-active-server-id'

export const OpencodeProjectSelectionSchema = z.object({
    id: z.string(),
    worktree: z.string(),
})

export type OpencodeProjectSelection = z.infer<typeof OpencodeProjectSelectionSchema>

export const OpencodeServerSchema = z.object({
    id: z.string(),
    name: z.string().optional(),
    baseUrl: z.string(),
    lastProject: OpencodeProjectSelectionSchema.optional(),
})

export type OpencodeServer = z.infer<typeof OpencodeServerSchema>

const ServersSchema = z.array(OpencodeServerSchema)

function loadServers(): OpencodeServer[] {
    const raw = opencodeStorage.getString(SERVERS_KEY)
    if (!raw) {
        return []
    }

    try {
        const parsed = ServersSchema.safeParse(JSON.parse(raw))
        if (!parsed.success) {
            return []
        }
        return parsed.data
    } catch {
        return []
    }
}

function saveServers(servers: OpencodeServer[]): void {
    opencodeStorage.set(SERVERS_KEY, JSON.stringify(servers))
}

export function getServers(): OpencodeServer[] {
    return loadServers()
}

export function getServerById(serverId: string): OpencodeServer | null {
    const servers = loadServers()
    return servers.find((s) => s.id === serverId) ?? null
}

export function addServer(fields: { baseUrl: string; name?: string }): OpencodeServer {
    const servers = loadServers()

    const server: OpencodeServer = {
        id: uuidv4(),
        baseUrl: fields.baseUrl.trim(),
        name: fields.name?.trim() || undefined,
    }

    saveServers([server, ...servers])
    return server
}

export function updateServer(serverId: string, patch: Partial<Pick<OpencodeServer, 'name' | 'baseUrl' | 'lastProject'>>): void {
    const servers = loadServers()
    const updated = servers.map((s) => {
        if (s.id !== serverId) {
            return s
        }
        return {
            ...s,
            ...patch,
        }
    })
    saveServers(updated)
}

export function removeServer(serverId: string): void {
    const servers = loadServers()
    const updated = servers.filter((s) => s.id !== serverId)
    saveServers(updated)

    const activeId = getActiveServerId()
    if (activeId === serverId) {
        setActiveServerId(updated[0]?.id ?? null)
    }
}

export function getActiveServerId(): string | null {
    return opencodeStorage.getString(ACTIVE_SERVER_ID_KEY) ?? null
}

export function setActiveServerId(serverId: string | null): void {
    if (serverId) {
        opencodeStorage.set(ACTIVE_SERVER_ID_KEY, serverId)
    } else {
        opencodeStorage.delete(ACTIVE_SERVER_ID_KEY)
    }
}

export function setServerLastProject(serverId: string, project: OpencodeProjectSelection | null): void {
    updateServer(serverId, {
        lastProject: project ?? undefined,
    })
}

export function validateBaseUrl(url: string): { valid: boolean; error?: string } {
    if (!url || !url.trim()) {
        return { valid: false, error: 'Server URL cannot be empty' }
    }

    try {
        const parsed = new URL(url)
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
            return { valid: false, error: 'Server URL must use HTTP or HTTPS protocol' }
        }
        return { valid: true }
    } catch {
        return { valid: false, error: 'Invalid URL format' }
    }
}
