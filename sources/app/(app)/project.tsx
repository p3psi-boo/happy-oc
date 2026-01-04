import * as React from 'react'
import { useRouter } from 'expo-router'
import { View, ActivityIndicator } from 'react-native'
import { Item } from '@/components/Item'
import { ItemGroup } from '@/components/ItemGroup'
import { ItemList } from '@/components/ItemList'
import { t } from '@/text'
import { useOpencodeStore } from '@/opencode/store'
import { useUnistyles } from 'react-native-unistyles'

export default React.memo(() => {
    const router = useRouter()
    const { theme } = useUnistyles()

    const projects = useOpencodeStore((s) => s.projects)
    const refreshProjects = useOpencodeStore((s) => s.refreshProjects)
    const setActiveProject = useOpencodeStore((s) => s.setActiveProject)

    React.useEffect(() => {
        void refreshProjects()
    }, [refreshProjects])

    return (
        <>
            <ItemList>
                <ItemGroup title={t('opencode.project.projects')}>
                    {projects === null ? (
                        <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                            <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                        </View>
                    ) : projects.length === 0 ? (
                        <Item title={t('opencode.project.noProjects')} showChevron={false} />
                    ) : (
                        projects.map((p) => (
                            <Item
                                key={p.id}
                                title={p.displayName}
                                subtitle={p.worktree}
                                subtitleLines={1}
                                onPress={async () => {
                                    await setActiveProject(p)
                                    router.replace('/')
                                }}
                            />
                        ))
                    )}
                </ItemGroup>
            </ItemList>
        </>
    )
})
