import * as React from 'react'
import { Item } from '@/components/Item'
import { ItemGroup } from '@/components/ItemGroup'
import { ItemList } from '@/components/ItemList'
import { useRouter } from 'expo-router'
import { t } from '@/text'
import { useOpencodeStore } from '@/opencode/store'

export const OpencodeSettingsView = React.memo(() => {
    const router = useRouter()
    const activeServerId = useOpencodeStore((s) => s.activeServerId)
    const activeProject = useOpencodeStore((s) => s.activeProject)

    return (
        <ItemList>
            <ItemGroup title={t('opencode.settings.connection')}>
                <Item
                    title={t('opencode.settings.servers')}
                    subtitle={activeServerId ? t('opencode.settings.serverSelected') : t('opencode.settings.serverNotSelected')}
                    onPress={() => router.push('/server')}
                />
                <Item
                    title={t('opencode.settings.project')}
                    subtitle={activeProject?.worktree ? activeProject.worktree : t('opencode.settings.projectNotSelected')}
                    onPress={() => router.push('/project')}
                />
            </ItemGroup>
        </ItemList>
    )
})
