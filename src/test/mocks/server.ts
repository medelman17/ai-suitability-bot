import { setupServer } from 'msw/node'
import { handlers } from './handlers'

/**
 * MSW server instance for intercepting network requests in tests.
 *
 * Usage:
 * - Handlers in ./handlers.ts are loaded by default
 * - Override handlers in individual tests with server.use(...)
 * - Reset handlers after each test with server.resetHandlers()
 */
export const server = setupServer(...handlers)
