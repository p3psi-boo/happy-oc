import React from 'react';
import { View, Platform } from 'react-native';
import { StyleSheet, useUnistyles } from 'react-native-unistyles';
import { useRouter, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { MultiTextInput } from '@/components/MultiTextInput';
import { Typography } from '@/constants/Typography';
import { t } from '@/text';
import { hapticsLight } from '@/components/haptics';
import { MultiTextInputHandle } from '@/components/MultiTextInput';
import { Ionicons } from '@expo/vector-icons';
import { Text, Pressable } from 'react-native';
import { getFullscreenEditorCallback, clearFullscreenEditorCallback } from '@/utils/fullscreenEditorCallback';
import { useCallback } from 'react';

const stylesheet = StyleSheet.create((theme, runtime) => ({
    container: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: runtime.insets.top,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.divider,
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: theme.colors.text,
        ...Typography.default('semiBold'),
    },
    closeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    closeButtonText: {
        fontSize: 14,
        color: theme.colors.text,
        ...Typography.default(),
    },
    content: {
        flex: 1,
        padding: 16,
    },
}));

export default function FullscreenEditorScreen() {
    const styles = stylesheet;
    const { theme } = useUnistyles();
    const router = useRouter();
    const params = useLocalSearchParams<{ value: string; placeholder: string }>();
    
    const [value, setValue] = React.useState(params.value || '');
    const inputRef = React.useRef<MultiTextInputHandle>(null);

    const handleClose = useCallback(() => {
        hapticsLight();
        const callback = getFullscreenEditorCallback();
        if (callback) {
            callback(value);
            clearFullscreenEditorCallback();
        }
        router.back();
    }, [router, value]);

    useFocusEffect(
        useCallback(() => {
            return () => {
                const callback = getFullscreenEditorCallback();
                if (callback) {
                    callback(value);
                    clearFullscreenEditorCallback();
                }
            };
        }, [value])
    );

    React.useEffect(() => {
        requestAnimationFrame(() => {
            inputRef.current?.focus();
            const cursorPosition = value.length;
            inputRef.current?.setTextAndSelection(value, { start: cursorPosition, end: cursorPosition });
        });
    }, []);

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>{t('agentInput.fullscreenEditor')}</Text>
                <Pressable
                    onPress={handleClose}
                    style={({ pressed }) => ({
                        flexDirection: 'row',
                        alignItems: 'center',
                        gap: 6,
                        paddingHorizontal: 12,
                        paddingVertical: 8,
                        borderRadius: 8,
                        opacity: pressed ? 0.7 : 1,
                    })}
                >
                    <Ionicons name="close" size={20} color={theme.colors.text} />
                    <Text style={styles.closeButtonText}>{t('agentInput.closeFullscreen')}</Text>
                </Pressable>
            </View>
            <View style={styles.content}>
                <MultiTextInput
                    ref={inputRef}
                    value={value}
                    paddingTop={Platform.OS === 'web' ? 10 : 8}
                    paddingBottom={Platform.OS === 'web' ? 10 : 8}
                    onChangeText={setValue}
                    placeholder={params.placeholder || ''}
                    maxHeight={undefined}
                />
            </View>
        </View>
    );
}