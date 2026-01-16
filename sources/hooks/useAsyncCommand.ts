import * as React from 'react';

export function useAsyncCommand(command: () => Promise<void>) {
    const stateRef = React.useRef(false);
    const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
    
    const execute = async () => {
        // Guard
        if (stateRef.current) {
            return;
        }
        stateRef.current = true;
        forceUpdate();

        // Execution
        try {
            await command();
        } finally {
            stateRef.current = false;
            forceUpdate();
        }
    };

    return [stateRef.current, execute] as const;
}