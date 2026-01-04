let fullscreenEditorCallback: ((text: string) => void) | null = null;

export function setFullscreenEditorCallback(callback: (text: string) => void) {
    fullscreenEditorCallback = callback;
}

export function getFullscreenEditorCallback() {
    return fullscreenEditorCallback;
}

export function clearFullscreenEditorCallback() {
    fullscreenEditorCallback = null;
}