import * as React from 'react'
import { Drawer } from 'expo-router/drawer'
import { useWindowDimensions } from 'react-native'
import { useIsTablet } from '@/utils/responsive'

export const SidebarNavigator = React.memo(() => {
    const isTablet = useIsTablet()
    const { width: windowWidth } = useWindowDimensions()

    // Drawer is temporarily disabled until the opencode sidebar is implemented.
    const showPermanentDrawer = false && isTablet

    const drawerWidth = React.useMemo(() => {
        if (!showPermanentDrawer) {
            return 280
        }
        return Math.min(Math.max(Math.floor(windowWidth * 0.3), 250), 360)
    }, [windowWidth, showPermanentDrawer])

    const drawerNavigationOptions = React.useMemo(() => {
        if (!showPermanentDrawer) {
            return {
                lazy: false,
                headerShown: false,
                drawerType: 'front' as const,
                swipeEnabled: false,
                drawerStyle: {
                    width: 0,
                    display: 'none' as const,
                },
            }
        }

        return {
            lazy: false,
            headerShown: false,
            drawerType: 'permanent' as const,
            drawerStyle: {
                backgroundColor: 'white',
                borderRightWidth: 0,
                width: drawerWidth,
            },
            swipeEnabled: false,
            drawerActiveTintColor: 'transparent',
            drawerInactiveTintColor: 'transparent',
            drawerItemStyle: { display: 'none' as const },
            drawerLabelStyle: { display: 'none' as const },
        }
    }, [showPermanentDrawer, drawerWidth])

    return <Drawer screenOptions={drawerNavigationOptions} />
})
