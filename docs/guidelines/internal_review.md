# Internal Review Guide

## Requesting a Review

When code review is needed, delegate to a subagent.

### Subagent Invocation

Use a general-purpose subagent with the following information:

- File paths and summary of changes under review
- Specific concerns to focus on (design decisions, performance, security, etc.)
- Project constraints (`as` casting prohibited, Effect-TS required, raw `fetch` prohibited, etc.)

### Review Criteria

Include the following perspectives when requesting a review:

1. **Project conventions**: No `as` casting, proper Effect-TS usage, Hono RPC + TanStack Query for API access
2. **Type safety**: Proper use of type guards and Zod validation
3. **Test coverage**: TDD-based test completeness
4. **Side effect management**: Proper handling via Effect-TS
5. **Code simplicity**: No unnecessary complexity

### Simplify Skill

For lightweight code quality checks, the `simplify` skill is also available. It reviews changed code for reuse, quality, and efficiency, and fixes any issues found.
