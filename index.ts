import { fetch as expoFetch } from 'expo/fetch';

// @opencode-ai/sdk uses global fetch for SSE; ensure streaming fetch is available.
(globalThis as any).fetch = expoFetch;

import './sources/unistyles';
import 'expo-router/entry';
