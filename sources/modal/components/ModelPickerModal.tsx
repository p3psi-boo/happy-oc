import React from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { BaseModal } from './BaseModal';
import { Typography } from '@/constants/Typography';
import { useUnistyles } from 'react-native-unistyles';

interface Model {
    id: string;
    name: string;
}

interface ModelPickerModalProps {
    models: Model[];
    selectedModelId: string;
    onClose: () => void;
    onSelect: (modelId: string) => void;
}

export function ModelPickerModal({ models, selectedModelId, onClose, onSelect }: ModelPickerModalProps) {
    const { theme } = useUnistyles();

    const styles = StyleSheet.create({
        container: {
            backgroundColor: theme.colors.surface,
            borderRadius: 14,
            width: 320,
            maxHeight: 400,
            overflow: 'hidden',
            shadowColor: theme.colors.shadow.color,
            shadowOffset: {
                width: 0,
                height: 2
            },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5
        },
        header: {
            paddingHorizontal: 16,
            paddingTop: 20,
            paddingBottom: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.divider
        },
        title: {
            fontSize: 17,
            textAlign: 'center',
            color: theme.colors.text
        },
        scrollView: {
            maxHeight: 300
        },
        modelItem: {
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: theme.colors.divider,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between'
        },
        modelItemPressed: {
            backgroundColor: theme.colors.surfacePressed
        },
        modelName: {
            fontSize: 15,
            color: theme.colors.text,
            flex: 1
        },
        checkmark: {
            fontSize: 18,
            fontWeight: '600'
        },
        footer: {
            paddingHorizontal: 16,
            paddingVertical: 12,
            borderTopWidth: 1,
            borderTopColor: theme.colors.divider
        },
        cancelButton: {
            paddingVertical: 10,
            alignItems: 'center'
        },
        cancelText: {
            fontSize: 16,
            color: theme.colors.textLink
        }
    });

    return (
        <BaseModal visible={true} onClose={onClose} closeOnBackdrop={true}>
            <View style={styles.container}>
                <View style={styles.header}>
                    <Text style={[styles.title, Typography.default('semiBold')]}>
                        Select Model
                    </Text>
                </View>

                <ScrollView style={styles.scrollView}>
                    {models.map((model) => (
                        <Pressable
                            key={model.id}
                            onPress={() => onSelect(model.id)}
                            style={({ pressed }) => [
                                styles.modelItem,
                                pressed && styles.modelItemPressed
                            ]}
                        >
                            <Text style={[styles.modelName, Typography.default()]}>
                                {model.name}
                            </Text>
                            {selectedModelId === model.id && (
                                <Text style={{ ...styles.checkmark, color: theme.colors.button.primary.background }}>✓</Text>
                            )}
                        </Pressable>
                    ))}
                </ScrollView>

                <View style={styles.footer}>
                    <Pressable style={styles.cancelButton} onPress={onClose}>
                        <Text style={[styles.cancelText, Typography.default('semiBold')]}>
                            Cancel
                        </Text>
                    </Pressable>
                </View>
            </View>
        </BaseModal>
    );
}