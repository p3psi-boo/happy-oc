import { createOpencodeClient, type OpencodeClient, type OpencodeClientConfig } from '@opencode-ai/sdk'

export function createServerClient(baseUrl: string): OpencodeClient {
    const config: OpencodeClientConfig = {
        baseUrl,
        throwOnError: true,
    }

    return createOpencodeClient(config)
}

export function createProjectClient(baseUrl: string, directory: string): OpencodeClient {
    const config: OpencodeClientConfig & { directory: string } = {
        baseUrl,
        directory,
        throwOnError: true,
    }

    return createOpencodeClient(config)
}
