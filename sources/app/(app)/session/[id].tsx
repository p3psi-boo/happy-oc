import * as React from 'react'
import { useLocalSearchParams } from 'expo-router'
import { OpencodeSessionView } from '@/components/OpencodeSessionView'

export default React.memo(() => {
    const params = useLocalSearchParams<{ id: string }>()
    const sessionId = params.id

    if (!sessionId) {
        return null
    }

    return <OpencodeSessionView sessionId={sessionId} />
})
