import React from 'react'
import { View } from 'react-native'
import { Stack, useRouter } from 'expo-router'
import { Ionicons } from '@expo/vector-icons'
import { Item } from '@/components/Item'
import { ItemGroup } from '@/components/ItemGroup'
import { ItemList } from '@/components/ItemList'
import { Modal } from '@/modal'
import { t } from '@/text'
import { useUnistyles } from 'react-native-unistyles'
import { createServerClient } from '@/opencode/client'
import { validateBaseUrl } from '@/opencode/storage'
import { useOpencodeStore } from '@/opencode/store'

function deriveServerName(baseUrl: string): string {
    try {
        const parsed = new URL(baseUrl)
        return parsed.hostname
    } catch {
        return baseUrl
    }
}

export default React.memo(() => {
    const router = useRouter()
    const { theme } = useUnistyles()

    const servers = useOpencodeStore((s) => s.servers)
    const activeServerId = useOpencodeStore((s) => s.activeServerId)
    const addServer = useOpencodeStore((s) => s.addServer)
    const removeServer = useOpencodeStore((s) => s.removeServer)
    const setActiveServer = useOpencodeStore((s) => s.setActiveServer)

    const validateServer = React.useCallback(async (baseUrl: string) => {
        const client = createServerClient(baseUrl)
        await client.project.list({ throwOnError: true })
    }, [])

    const handleAddServer = React.useCallback(async () => {
        const inputUrl = await Modal.prompt(t('opencode.settings.servers'), undefined, {
            placeholder: t('common.urlPlaceholder'),
            confirmText: t('common.save'),
            cancelText: t('common.cancel'),
        })

        if (!inputUrl) {
            return
        }

        const validation = validateBaseUrl(inputUrl)
        if (!validation.valid) {
            Modal.alert(t('common.error'), validation.error || t('errors.invalidFormat'))
            return
        }

        try {
            await validateServer(inputUrl)
        } catch {
            Modal.alert(t('common.error'), t('server.failedToConnectToServer'))
            return
        }

        await addServer({
            baseUrl: inputUrl,
            name: deriveServerName(inputUrl),
        })

        router.replace('/project')
    }, [addServer, router, validateServer])

    return (
        <>
            <Stack.Screen
                options={{
                    headerShown: true,
                    headerTitle: t('opencode.settings.servers'),
                    headerBackTitle: t('common.back'),
                }}
            />

            <ItemList>
                <ItemGroup title={t('opencode.settings.connection')}>
                    {servers.length === 0 ? (
                        <Item title={t('server.enterServerUrl')} showChevron={false} />
                    ) : (
                        servers.map((server) => (
                            <Item
                                key={server.id}
                                title={server.name || deriveServerName(server.baseUrl)}
                                subtitle={server.baseUrl}
                                subtitleLines={1}
                                onPress={async () => {
                                    await setActiveServer(server.id)
                                    router.replace(server.lastProject ? '/' : '/project')
                                }}
                                onLongPress={async () => {
                                    const confirmed = await Modal.confirm(
                                        t('common.delete'),
                                        server.baseUrl,
                                        { confirmText: t('common.delete'), destructive: true },
                                    )
                                    if (confirmed) {
                                        await removeServer(server.id)
                                    }
                                }}
                                rightElement={
                                    server.id === activeServerId ? (
                                        <Ionicons name="checkmark" size={18} color={theme.colors.textSecondary} />
                                    ) : null
                                }
                            />
                        ))
                    )}

                    <Item
                        title={t('opencode.settings.addServer')}
                        icon={<Ionicons name="add-circle-outline" size={24} color={theme.colors.textSecondary} />}
                        onPress={handleAddServer}
                    />
                </ItemGroup>
            </ItemList>
        </>
    )
})
