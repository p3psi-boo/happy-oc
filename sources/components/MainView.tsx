import * as React from 'react'
import { View } from 'react-native'
import { StyleSheet } from 'react-native-unistyles'
import { TabBar, TabType } from '@/components/TabBar'
import { OpencodeSessionsListWrapper } from '@/components/OpencodeSessionsListWrapper'
import { OpencodeSettingsView } from '@/components/OpencodeSettingsView'

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

    const [activeTab, setActiveTab] = React.useState<TabType>('sessions')

    const renderTabContent = React.useCallback(() => {
        switch (activeTab) {
            case 'settings':
                return <OpencodeSettingsView />
            case 'sessions':
            default:
                return <OpencodeSessionsListWrapper />
        }
    }, [activeTab])

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
