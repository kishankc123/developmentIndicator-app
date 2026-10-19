# Instructions for Claude

Read @context.md first. It holds the project goal, architecture, and risks.

## Stack
- UI framework: **React 19** (use its current APIs; check the docs if unsure).
- Language: TypeScript.
- Anything not stated in context.md is **unknown**: check it (docs, real API responses, installed package versions) before writing code that depends on it. Never guess field names, props, or API shapes.

## Component-based development
- Build the UI from small, single-purpose, reusable components.
- Keep data fetching in hooks or the typed API layer, not inside presentational components.
- Components receive data and callbacks through props; state lives at the lowest level that needs it.
- Keep components Bit-ready: self-contained, typed props, no hidden dependencies on app globals.

## Comments
- Every function and component gets a short comment saying what it does.
- For child components, document each prop, especially props and callbacks passed down from a parent: what the parent supplies and when the callback fires.
- Comment the "why" for anything non-obvious (null handling, join keys, workarounds). Do not narrate obvious code.

## Commits
Use Conventional Commits: `<type>: <short description>`
- `feat:` new feature
- `fix:` bug fix
- `docs:` documentation only
- `test:` tests
- `refactor:` code change without behavior change
- `chore:` tooling, config, dependencies

One logical change per commit. Keep the subject under about 72 characters, in the imperative ("add", not "added").

## Documentation
- Keep docs clean and concise. Update README.md and context.md when architecture or decisions change.
- Record unverified assumptions as such, and remove them once checked.

## Testing
- Vitest + React Testing Library for units and components; Playwright for end-to-end.
- Add or update tests with each feature.
