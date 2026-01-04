import * as React from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { RoundButton } from '@/components/RoundButton'
import { ItemGroup } from '@/components/ItemGroup'
import { ItemList } from '@/components/ItemList'
import { MainView } from '@/components/MainView'
import { t } from '@/text'
import { useOpencodeStore } from '@/opencode/store'

export default React.memo(function Home() {
    const router = useRouter()

    const activeServerId = useOpencodeStore((s) => s.activeServerId)
    const activeProject = useOpencodeStore((s) => s.activeProject)
    const reloadServers = useOpencodeStore((s) => s.reloadServers)
    const connectEvents = useOpencodeStore((s) => s.connectEvents)
    const refreshSessions = useOpencodeStore((s) => s.refreshSessions)

    React.useEffect(() => {
        reloadServers()
    }, [reloadServers])

    React.useEffect(() => {
        if (activeServerId && activeProject) {
            void connectEvents()
            void refreshSessions({ force: true })
        }
    }, [activeServerId, activeProject, connectEvents, refreshSessions])

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

    if (!activeProject) {
        return (
            <ItemList>
                <ItemGroup>
                    <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
                        <RoundButton
                            title={t('opencode.settings.projectNotSelected')}
                            onPress={() => router.push('/project')}
                        />
                    </View>
                </ItemGroup>
            </ItemList>
        )
    }

    return <MainView variant="phone" />
})
