import createClient from 'openapi-fetch'
import type { paths } from './schema'

const apiUrl = import.meta.env.API_URL?.replace(/\/+$/, '')

if (!apiUrl) {
  throw new Error('Missing API_URL environment variable')
}

export const api = createClient<paths>({
  baseUrl: apiUrl,
  credentials: 'include',
})
