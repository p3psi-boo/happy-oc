import 'react-native-quick-base64'
import '../theme.css'
import * as React from 'react'
import * as SplashScreen from 'expo-splash-screen'
import * as Fonts from 'expo-font'
import * as Notifications from 'expo-notifications'
import { FontAwesome } from '@expo/vector-icons'
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native'
import { KeyboardProvider } from 'react-native-keyboard-controller'
import { initialWindowMetrics, SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { SidebarNavigator } from '@/components/SidebarNavigator'
import { View, Platform } from 'react-native'
import { ModalProvider } from '@/modal'
import { StatusBarProvider } from '@/components/StatusBarProvider'
import { monkeyPatchConsoleForRemoteLoggingForFasterAiAutoDebuggingOnlyInLocalBuilds } from '@/utils/remoteLogger'
import { useUnistyles } from 'react-native-unistyles'
import { AsyncLock } from '@/utils/lock'
import { useOpencodeStore } from '@/opencode/store'

// Configure notification handler for foreground notifications
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
})

// Setup Android notification channel (required for Android 8.0+)
if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', {
        name: 'Default',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FF231F7C',
    })
}

export {
    // Catch any errors thrown by the Layout component.
    ErrorBoundary,
} from 'expo-router'

// Configure splash screen
SplashScreen.setOptions({
    fade: true,
    duration: 300,
})
SplashScreen.preventAutoHideAsync()

// NEVER ENABLE REMOTE LOGGING IN PRODUCTION
if (!!process.env.PUBLIC_EXPO_DANGEROUSLY_LOG_TO_SERVER_FOR_AI_AUTO_DEBUGGING) {
    monkeyPatchConsoleForRemoteLoggingForFasterAiAutoDebuggingOnlyInLocalBuilds()
}

function HorizontalSafeAreaWrapper({ children }: { children: React.ReactNode }) {
    const insets = useSafeAreaInsets()
    return (
        <View
            style={{
                flex: 1,
                paddingLeft: insets.left,
                paddingRight: insets.right,
            }}
        >
            {children}
        </View>
    )
}

const lock = new AsyncLock()
let loaded = false
async function loadFonts() {
    await lock.inLock(async () => {
        if (loaded) {
            return
        }
        loaded = true

        const isTauri =
            Platform.OS === 'web' &&
            typeof window !== 'undefined' &&
            (window as any).__TAURI_INTERNALS__ !== undefined

        if (!isTauri) {
            await Fonts.loadAsync({
                SpaceMono: require('@/assets/fonts/SpaceMono-Regular.ttf'),

                'IBMPlexSans-Regular': require('@/assets/fonts/IBMPlexSans-Regular.ttf'),
                'IBMPlexSans-Italic': require('@/assets/fonts/IBMPlexSans-Italic.ttf'),
                'IBMPlexSans-SemiBold': require('@/assets/fonts/IBMPlexSans-SemiBold.ttf'),

                'IBMPlexMono-Regular': require('@/assets/fonts/IBMPlexMono-Regular.ttf'),
                'IBMPlexMono-Italic': require('@/assets/fonts/IBMPlexMono-Italic.ttf'),
                'IBMPlexMono-SemiBold': require('@/assets/fonts/IBMPlexMono-SemiBold.ttf'),

                'BricolageGrotesque-Bold': require('@/assets/fonts/BricolageGrotesque-Bold.ttf'),

                ...FontAwesome.font,
            })
        } else {
            console.log('Do not wait for fonts to load')
            void Fonts.loadAsync({
                SpaceMono: require('@/assets/fonts/SpaceMono-Regular.ttf'),

                'IBMPlexSans-Regular': require('@/assets/fonts/IBMPlexSans-Regular.ttf'),
                'IBMPlexSans-Italic': require('@/assets/fonts/IBMPlexSans-Italic.ttf'),
                'IBMPlexSans-SemiBold': require('@/assets/fonts/IBMPlexSans-SemiBold.ttf'),

                'IBMPlexMono-Regular': require('@/assets/fonts/IBMPlexMono-Regular.ttf'),
                'IBMPlexMono-Italic': require('@/assets/fonts/IBMPlexMono-Italic.ttf'),
                'IBMPlexMono-SemiBold': require('@/assets/fonts/IBMPlexMono-SemiBold.ttf'),

                'BricolageGrotesque-Bold': require('@/assets/fonts/BricolageGrotesque-Bold.ttf'),

                ...FontAwesome.font,
            }).catch(() => undefined)
        }
    })
}

export default function RootLayout() {
    const { theme } = useUnistyles()
    const navigationTheme = React.useMemo(() => {
        if (theme.dark) {
            return {
                ...DarkTheme,
                colors: {
                    ...DarkTheme.colors,
                    background: theme.colors.groupped.background,
                },
            }
        }
        return {
            ...DefaultTheme,
            colors: {
                ...DefaultTheme.colors,
                background: theme.colors.groupped.background,
            },
        }
    }, [theme.dark])

    const [isReady, setIsReady] = React.useState(false)

    const reloadServers = useOpencodeStore((s) => s.reloadServers)
    const getActiveContext = useOpencodeStore((s) => s.getActiveContext)
    const connectEvents = useOpencodeStore((s) => s.connectEvents)
    const refreshSessions = useOpencodeStore((s) => s.refreshSessions)

    React.useEffect(() => {
        void (async () => {
            try {
                await loadFonts()
                setIsReady(true)
            } catch (error) {
                console.error('Error initializing:', error)
                setIsReady(true)
            }
        })()
    }, [])

    React.useEffect(() => {
        if (isReady) {
            setTimeout(() => {
                SplashScreen.hideAsync()
            }, 100)
        }
    }, [isReady])

    React.useEffect(() => {
        if (!isReady) {
            return
        }

        reloadServers()

        const ctx = getActiveContext()
        if (ctx) {
            void connectEvents()
            void refreshSessions({ force: true })
        }
    }, [connectEvents, getActiveContext, isReady, refreshSessions, reloadServers])


    if (!isReady) {
        return null
    }

    let providers = (
        <SafeAreaProvider initialMetrics={initialWindowMetrics}>
            <KeyboardProvider>
                <GestureHandlerRootView style={{ flex: 1 }}>
                    <ThemeProvider value={navigationTheme}>
                        <StatusBarProvider />
                        <ModalProvider>
                            <HorizontalSafeAreaWrapper>
                                <SidebarNavigator />
                            </HorizontalSafeAreaWrapper>
                        </ModalProvider>
                    </ThemeProvider>
                </GestureHandlerRootView>
            </KeyboardProvider>
        </SafeAreaProvider>
    )

    return providers
}
