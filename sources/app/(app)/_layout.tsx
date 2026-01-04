import { Stack } from 'expo-router'
import 'react-native-reanimated'
import * as React from 'react'
import { Typography } from '@/constants/Typography'
import { createHeader } from '@/components/navigation/Header'
import { Platform } from 'react-native'
import { isRunningOnMac } from '@/utils/platform'
import { useUnistyles } from 'react-native-unistyles'
import { t } from '@/text'

export const unstable_settings = {
    initialRouteName: 'index',
}

export default function RootLayout() {
    const shouldUseCustomHeader = Platform.OS === 'android' || isRunningOnMac() || Platform.OS === 'web'
    const { theme } = useUnistyles()

    const screenOptions = React.useMemo(
        () => ({
            header: shouldUseCustomHeader ? createHeader : undefined,
            headerBackTitle: t('common.back'),
            headerShadowVisible: false,
            contentStyle: {
                backgroundColor: theme.colors.surface,
            },
            headerStyle: {
                backgroundColor: theme.colors.header.background,
            },
            headerTintColor: theme.colors.header.tint,
            headerTitleStyle: {
                color: theme.colors.header.tint,
                ...Typography.default('semiBold'),
            },
        }),
        [
            shouldUseCustomHeader,
            theme.colors.header.background,
            theme.colors.header.tint,
            theme.colors.surface,
        ],
    )

    return (
        <Stack initialRouteName="index" screenOptions={screenOptions}>

            <Stack.Screen
                name="index"
                options={{
                    headerShown: false,
                    headerTitle: '',
                }}
            />
            <Stack.Screen
                name="settings/index"
                options={{
                    headerShown: true,
                    headerTitle: t('settings.title'),
                    headerBackTitle: t('common.home'),
                }}
            />
            <Stack.Screen
                name="server"
                options={{
                    headerShown: true,
                    headerTitle: t('opencode.settings.servers'),
                    headerBackTitle: t('common.back'),
                }}
            />
            <Stack.Screen
                name="project"
                options={{
                    headerShown: true,
                    headerTitle: t('opencode.project.selectTitle'),
                    headerBackTitle: t('common.back'),
                }}
            />
            <Stack.Screen
                name="session/[id]"
                options={{
                    headerShown: true,
                    headerTitle: '',
                    headerBackTitle: t('common.back'),
                }}
            />
            <Stack.Screen
                name="fullscreen-editor"
                options={{
                    headerShown: true,
                    headerTitle: t('agentInput.fullscreenEditor'),
                    headerBackTitle: t('common.back'),
                    presentation: 'modal',
                }}
            />
        </Stack>
    )
}
