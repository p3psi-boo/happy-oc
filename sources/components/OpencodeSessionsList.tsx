import * as React from 'react'
import { FlatList, Pressable, View } from 'react-native'
import { Text } from '@/components/StyledText'
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
    createdAt: number
    updatedAt: number
}

function formatRelativeTime(timestamp: number): string {
    const now = Date.now()
    const diff = now - timestamp
    const seconds = Math.floor(diff / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    const days = Math.floor(hours / 24)

    if (seconds < 60) {
        return t('time.justNow')
    } else if (minutes < 60) {
        return t('time.minutesAgo', { count: minutes })
    } else if (hours < 24) {
        return t('time.hoursAgo', { count: hours })
    } else {
        return t('time.daysAgo', { count: days })
    }
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
        minHeight: 72,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: theme.colors.surface,
        marginHorizontal: 16,
        marginBottom: 8,
        borderRadius: 12,
    },
    sessionContent: {
        flex: 1,
        justifyContent: 'center',
    },
    sessionTitle: {
        fontSize: 15,
        fontWeight: '500',
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
    statusText: {
        fontSize: 12,
        fontWeight: '500',
        lineHeight: 16,
        ...Typography.default(),
    },
    timeRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeText: {
        fontSize: 12,
        color: theme.colors.textSecondary,
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

    if (status.type === 'offline') {
        return { text: t('status.offline'), color: '#FF9500', dotColor: '#FF9500', pulsing: false }
    }

    if (status.type === 'error') {
        return { text: status.message || t('status.error'), color: '#FF3B30', dotColor: '#FF3B30', pulsing: false }
    }

    return { text: '', color: 'transparent', dotColor: 'transparent', pulsing: false }
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
                createdAt: session.createdAt,
                updatedAt: session.updatedAt,
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
                    <View style={styles.sessionContent}>
                        <Text style={styles.sessionTitle}>
                            {item.title}
                        </Text>
                        <Text style={styles.sessionSubtitle} numberOfLines={1}>
                            {item.subtitle}
                        </Text>
                        {item.statusText ? (
                            <View style={styles.statusRow}>
                                <Text style={[styles.statusText, { color: item.statusColor }]} numberOfLines={1}>
                                    {item.statusText}
                                </Text>
                            </View>
                        ) : (
                            <View style={styles.timeRow}>
                                <Text style={styles.timeText}>
                                    {formatRelativeTime(item.updatedAt)}
                                </Text>
                            </View>
                        )}
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
