import * as React from 'react'
import { FlatList, Pressable, View } from 'react-native'
import { Text } from '@/components/StyledText'
import { Avatar } from '@/components/Avatar'
import { StatusDot } from '@/components/StatusDot'
import { useRouter } from 'expo-router'
import { StyleSheet, useUnistyles } from 'react-native-unistyles'
import { Typography } from '@/constants/Typography'
import { layout } from '@/components/layout'
import { t } from '@/text'
import { useOpencodeStore } from '@/opencode/store'

type SessionRow = {
    id: string
    title: string
    subtitle: string
    statusText: string
    statusColor: string
    statusDotColor: string
    isPulsing: boolean
    avatarId: string
}

const stylesheet = StyleSheet.create((theme) => ({
    container: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'stretch',
        backgroundColor: theme.colors.groupped.background,
    },
    contentContainer: {
        flex: 1,
        maxWidth: layout.maxWidth,
    },
    sessionItem: {
        height: 88,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        backgroundColor: theme.colors.surface,
        marginHorizontal: 16,
        marginBottom: 1,
        borderRadius: 12,
    },
    sessionContent: {
        flex: 1,
        marginLeft: 16,
        justifyContent: 'center',
    },
    sessionTitle: {
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    sessionSubtitle: {
        fontSize: 13,
        color: theme.colors.textSecondary,
        marginBottom: 4,
        ...Typography.default(),
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    statusDotContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        height: 16,
        marginTop: 2,
        marginRight: 4,
    },
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 16,
        ...Typography.default(),
    },
}))

function getStatusLabel(
    status: { type: string; message?: string; attempt?: number; next?: number },
    hasPendingPermissions: boolean,
): { text: string; color: string; dotColor: string; pulsing: boolean } {
    if (hasPendingPermissions) {
        return { text: t('status.permissionRequired'), color: '#FF9500', dotColor: '#FF9500', pulsing: true }
    }

    if (status.type === 'busy') {
        return { text: t('opencode.status.busy'), color: '#007AFF', dotColor: '#007AFF', pulsing: true }
    }

    if (status.type === 'retry') {
        return { text: t('opencode.status.retrying'), color: '#FF9500', dotColor: '#FF9500', pulsing: true }
    }

    return { text: t('status.online'), color: '#34C759', dotColor: '#34C759', pulsing: false }
}

export const OpencodeSessionsList = React.memo(() => {
    const router = useRouter()
    const styles = stylesheet
    const { theme } = useUnistyles()

    const sessions = useOpencodeStore((s) => s.sessions)

    const data: SessionRow[] = React.useMemo(() => {
        if (!sessions) {
            return []
        }

        return sessions.map((session) => {
            const status = getStatusLabel(session.status as any, session.hasPendingPermissions)
            return {
                id: session.id,
                title: session.title || t('opencode.sessions.untitled'),
                subtitle: session.directory,
                statusText: status.text,
                statusColor: status.color,
                statusDotColor: status.dotColor,
                isPulsing: status.pulsing,
                avatarId: `${session.directory}`,
            }
        })
    }, [sessions])

    const renderItem = React.useCallback(
        ({ item }: { item: SessionRow }) => {
            return (
                <Pressable
                    style={styles.sessionItem}
                    onPress={() => {
                        router.push(`/session/${item.id}`)
                    }}
                >
                    <Avatar id={item.avatarId} size={48} monochrome={false} />
                    <View style={styles.sessionContent}>
                        <Text style={styles.sessionTitle} numberOfLines={1}>
                            {item.title}
                        </Text>
                        <Text style={styles.sessionSubtitle} numberOfLines={1}>
                            {item.subtitle}
                        </Text>
                        <View style={styles.statusRow}>
                            <View style={styles.statusDotContainer}>
                                <StatusDot color={item.statusDotColor} isPulsing={item.isPulsing} />
                            </View>
                            <Text style={[styles.statusText, { color: item.statusColor }]} numberOfLines={1}>
                                {item.statusText}
                            </Text>
                        </View>
                    </View>
                </Pressable>
            )
        },
        [router, styles],
    )

    return (
        <View style={styles.container}>
            <View style={styles.contentContainer}>
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
                    style={{ maxWidth: layout.maxWidth, width: '100%', alignSelf: 'center' }}
                    ListEmptyComponent={
                        sessions === null
                            ? null
                            : () => (
                                  <View style={{ padding: 24 }}>
                                      <Text style={{ color: theme.colors.textSecondary }}>
                                          {t('opencode.sessions.empty')}
                                      </Text>
                                  </View>
                              )
                    }
                />
            </View>
        </View>
    )
})
