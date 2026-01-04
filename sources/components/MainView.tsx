import * as React from 'react'
import { View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { TabBar, TabType } from '@/components/TabBar'
import { OpencodeSessionsListWrapper } from '@/components/OpencodeSessionsListWrapper'
import { OpencodeSettingsView } from '@/components/OpencodeSettingsView'
import { ItemList } from '@/components/ItemList'
import { ItemGroup } from '@/components/ItemGroup'
import { RoundButton } from '@/components/RoundButton'
import { t } from '@/text'
import { useRouter } from 'expo-router'
import { useOpencodeStore } from '@/opencode/store'

interface MainViewProps {
    variant: 'phone' | 'sidebar'
}

const styles = StyleSheet.create(() => ({
    container: {
        flex: 1,
    },
    phoneContainer: {
        flex: 1,
    },
    sidebarContentContainer: {
        flex: 1,
        flexBasis: 0,
        flexGrow: 1,
    },
}))

export const MainView = React.memo(({ variant }: MainViewProps) => {
    const router = useRouter()
    const [activeTab, setActiveTab] = React.useState<TabType>('session')
    const activeProject = useOpencodeStore((s) => s.activeProject)
    const activeServerId = useOpencodeStore((s) => s.activeServerId)

    const renderTabContent = React.useCallback(() => {
        switch (activeTab) {
            case 'servers':
                return <OpencodeSettingsView />
            case 'project':
                if (!activeServerId) {
                    return (
                        <ItemList>
                            <ItemGroup>
                                <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
                                    <RoundButton
                                        title={t('opencode.settings.serverNotSelected')}
                                        onPress={() => router.push('/server')}
                                    />
                                </View>
                            </ItemGroup>
                        </ItemList>
                    )
                }
                return (
                    <ItemList>
                        <ItemGroup title={t('opencode.project.projects')}>
                            <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
                                <RoundButton
                                    title={activeProject?.worktree || t('opencode.settings.projectNotSelected')}
                                    onPress={() => router.push('/project')}
                                />
                            </View>
                        </ItemGroup>
                    </ItemList>
                )
            case 'session':
            default:
                return <OpencodeSessionsListWrapper />
        }
    }, [activeTab, activeServerId, activeProject, router])

    if (variant === 'sidebar') {
        return (
            <View style={styles.sidebarContentContainer}>
                <OpencodeSessionsListWrapper />
            </View>
        )
    }

    return (
        <>
            <View style={styles.phoneContainer}>{renderTabContent()}</View>
            <TabBar activeTab={activeTab} onTabPress={setActiveTab} />
        </>
    )
})
