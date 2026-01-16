import * as React from 'react';
import { Modal } from '@/modal';
import { HappyError } from '@/utils/errors';

export function useHappyAction(action: () => Promise<void>) {
    const loadingRef = React.useRef(false);
    const [, forceUpdate] = React.useReducer((x) => x + 1, 0);
    
    const doAction = React.useCallback(() => {
        if (loadingRef.current) {
            return;
        }
        loadingRef.current = true;
        forceUpdate();
        
        (async () => {
            try {
                await action();
            } catch (e) {
                if (e instanceof HappyError) {
                    Modal.alert('Error', e.message, [{ text: 'OK', style: 'cancel' }]);
                } else {
                    Modal.alert('Error', 'Unknown error', [{ text: 'OK', style: 'cancel' }]);
                }
            } finally {
                loadingRef.current = false;
                forceUpdate();
            }
        })();
    }, [action]);
    
    return [loadingRef.current, doAction] as const;
}