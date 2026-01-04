import * as React from 'react'
import { ActivityIndicator, Pressable, View } from 'react-native'
import { Text } from '@/components/StyledText'
import { StyleSheet, useUnistyles } from 'react-native-unistyles'
import { Header } from '@/components/navigation/Header'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { Typography } from '@/constants/Typography'
import { t } from '@/text'
import { useOpencodeStore } from '@/opencode/store'
import { OpencodeSessionsList } from '@/components/OpencodeSessionsList'
import { Modal } from '@/modal'

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
    },
    loadingContainerWrapper: {
        flex: 1,
        flexBasis: 0,
        flexGrow: 1,
        backgroundColor: theme.colors.groupped.background,
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 32,
    },
    headerButton: {
        width: 32,
        height: 32,
        alignItems: 'center',
        justifyContent: 'center',
    },
    titleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    titleText: {
        fontSize: 17,
        color: theme.colors.header.tint,
        fontWeight: '600',
        ...Typography.default('semiBold'),
    },
    subtitleText: {
        marginTop: -2,
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 16,
        color: theme.colors.textSecondary,
        ...Typography.default(),
    },
}))

function HeaderTitle() {
    const styles = stylesheet
    const activeProject = useOpencodeStore((s) => s.activeProject)

    return (
        <View style={styles.titleContainer}>
            <Text style={styles.titleText} numberOfLines={1}>{t('tabs.session')}</Text>
            {activeProject?.worktree ? (
                <Text style={styles.subtitleText} numberOfLines={1}>
                    {activeProject.worktree}
                </Text>
            ) : null}
        </View>
    )
}

function HeaderLeft() {
    const router = useRouter()
    const styles = stylesheet
    const { theme } = useUnistyles()

    return (
        <Pressable onPress={() => router.push('/project')} hitSlop={15} style={styles.headerButton}>
            <Ionicons name="folder-outline" size={22} color={theme.colors.header.tint} />
        </Pressable>
    )
}

function HeaderRight() {
    const router = useRouter()
    const styles = stylesheet
    const { theme } = useUnistyles()
    const createSession = useOpencodeStore((s) => s.createSession)

    const handleCreate = React.useCallback(async () => {
        const title = await Modal.prompt(t('opencode.sessions.newTitle'), undefined, {
            placeholder: t('opencode.sessions.newPlaceholder'),
            confirmText: t('common.create'),
            cancelText: t('common.cancel'),
        })

        if (title && title.trim()) {
            const sessionId = await createSession({ title: title.trim() })
            if (sessionId) {
                router.push(`/session/${sessionId}`)
            }
        }
    }, [createSession, router])

    return (
        <Pressable onPress={handleCreate} hitSlop={15} style={styles.headerButton}>
            <Ionicons name="add-outline" size={28} color={theme.colors.header.tint} />
        </Pressable>
    )
}

export const OpencodeSessionsListWrapper = React.memo(() => {
    const { theme } = useUnistyles()
    const styles = stylesheet

    const sessions = useOpencodeStore((s) => s.sessions)

    return (
        <View style={styles.container}>
            <View style={{ backgroundColor: theme.colors.groupped.background }}>
                <Header
                    title={<HeaderTitle />}
                    headerRight={() => <HeaderRight />}
                    headerLeft={() => <HeaderLeft />}
                    headerShadowVisible={false}
                    headerTransparent={true}
                />
            </View>

            {sessions === null ? (
                <View style={styles.loadingContainerWrapper}>
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={theme.colors.textSecondary} />
                    </View>
                </View>
            ) : (
                <OpencodeSessionsList />
            )}
        </View>
    )
})
