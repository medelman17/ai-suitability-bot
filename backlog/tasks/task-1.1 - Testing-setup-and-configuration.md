---
id: task-1.1
title: Testing setup and configuration
status: Done
assignee: []
created_date: '2026-01-18 08:17'
updated_date: '2026-01-18 08:38'
labels:
  - testing
  - infrastructure
dependencies: []
parent_task_id: task-1
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Install and configure Vitest, Testing Library, and MSW for the Next.js App Router environment. Set up test scripts and coverage reporting.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Vitest is installed and configured for Next.js
- [x] #2 React Testing Library is installed
- [x] #3 MSW (Mock Service Worker) is installed for API mocking
- [x] #4 Test scripts added to package.json (test, test:watch, test:coverage)
- [x] #5 Coverage reporting outputs to coverage/ directory
- [x] #6 Test environment correctly handles Next.js App Router
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Implementation Notes

- Installed Vitest 4.x with @vitejs/plugin-react for React support
- Added @testing-library/react, @testing-library/jest-dom, and @testing-library/user-event
- MSW 2.x installed for API mocking with handlers and server setup in src/test/mocks/
- Created vitest.config.ts with jsdom environment and path alias support
- Test setup in src/test/setup.ts with MSW integration
- GitHub Actions CI workflow at .github/workflows/ci.yml with parallel lint/typecheck/test jobs
- Added smoke test for schemas to verify setup works (16 tests passing)
<!-- SECTION:NOTES:END -->
