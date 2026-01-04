import * as React from 'react'
import { View } from 'react-native'
import { useRouter } from 'expo-router'
import { StyleSheet, useUnistyles } from 'react-native-unistyles'
import { Text } from '@/components/StyledText'
import { Typography } from '@/constants/Typography'
import { t } from '@/text'
import { useOpencodeStore } from '@/opencode/store'
import { Header } from '@/components/navigation/Header'
import { Ionicons } from '@expo/vector-icons'
import { Pressable } from 'react-native'

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        backgroundColor: theme.colors.surface,
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        marginBottom: 12,
        ...Typography.default('semiBold'),
    },
    item: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        marginBottom: 4,
    },
    itemLabel: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        width: 100,
        ...Typography.default(),
    },
    itemValue: {
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
        ...Typography.default(),
    },
    statusDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginRight: 8,
    },
    serverName: {
        fontSize: 14,
        color: theme.colors.text,
        flex: 1,
        ...Typography.default(),
    },
    serverStatus: {
        fontSize: 12,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
    empty: {
        fontSize: 14,
        color: theme.colors.textSecondary,
        fontStyle: 'italic',
        ...Typography.default(),
    },
}))

function HeaderTitle() {
    const styles = stylesheet
    return <Text style={styles.sectionTitle}>{t('session.sessionInfoTitle')}</Text>
}

function HeaderRight() {
    const router = useRouter()
    const styles = stylesheet
    const { theme } = useUnistyles()

    return (
        <Pressable onPress={() => router.back()} hitSlop={15} style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="close" size={24} color={theme.colors.header.tint} />
        </Pressable>
    )
}

export default React.memo(function SessionInfoPage() {
    const styles = stylesheet
    const { theme } = useUnistyles()

    const getActiveContext = useOpencodeStore((s) => s.getActiveContext)
    const lspServers = useOpencodeStore((s) => s.lspServers)

    const ctx = React.useMemo(() => getActiveContext(), [getActiveContext])

    if (!ctx) {
        return (
            <View style={styles.container}>
                <Header
                    title={<HeaderTitle />}
                    headerRight={() => <HeaderRight />}
                    headerShadowVisible={false}
                />
                <View style={styles.content}>
                    <View style={styles.section}>
                        <Text style={styles.empty}>{t('session.noContext')}</Text>
                    </View>
                </View>
            </View>
        )
    }

    return (
        <View style={styles.container}>
            <Header
                title={<HeaderTitle />}
                headerRight={() => <HeaderRight />}
                headerShadowVisible={false}
            />
            <View style={styles.content}>
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('session.projectInfo')}</Text>
                    <View style={styles.item}>
                        <Text style={styles.itemLabel}>Worktree:</Text>
                        <Text style={styles.itemValue}>{ctx.project.worktree}</Text>
                    </View>
                    <View style={styles.item}>
                        <Text style={styles.itemLabel}>Project ID:</Text>
                        <Text style={styles.itemValue}>{ctx.project.id}</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('session.lspServers')}</Text>
                    {Object.keys(lspServers).length === 0 ? (
                        <Text style={styles.empty}>{t('session.noLspServers')}</Text>
                    ) : (
                        Object.entries(lspServers).map(([name, server]) => (
                            <View key={name} style={styles.item}>
                                <View style={[styles.statusDot, { backgroundColor: server.status === 'connected' ? '#34C759' : '#8E8E93' }]} />
                                <Text style={styles.serverName}>{name}</Text>
                                <Text style={styles.serverStatus}>{server.status}</Text>
                            </View>
                        ))
                    )}
                </View>
            </View>
        </View>
    )
})