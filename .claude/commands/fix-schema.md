---
description: 'セッションログのスキーマパースエラーを修正してPR作成'
allowed-tools: Edit(*.ts), Write(*.ts), Bash(pnpm, git, gh)
---

<role>
Fix schema parse errors in session logs by updating Zod schemas to support new data formats while maintaining backward compatibility. Create PR after verification.
</role>

<input>
User provides failing JSON data from session logs. The data structure indicates what needs to be supported.
</input>

<workflow>
**1. Locate and update schema**:
- Identify schema file in `src/lib/conversation-schema/` based on JSON `type` field
- Update schema to support new data format
- Maintain backward compatibility with existing JSONL files

**2. Fix type errors**:
- Update affected components to handle new schema types
- Follow project type safety rules (no `as` casting)

**3. Add tests**:
- Create or update test files for modified schemas
- Verify both old and new formats parse successfully

**4. Verify and commit**:
- Run `pnpm typecheck` (must pass)
- Run `pnpm test` (must pass)
- Run `pnpm fix`
- Commit changes

**5. Create PR**:
- Push branch
- Create draft PR with summary of schema changes
</workflow>

<principles>
- **Backward compatibility**: Existing JSONL files must continue to parse
- **Type safety**: Follow project rules (no `as` casting)
- **Atomic commits**: All related changes in single commit (schema + UI + tests)
- **Pattern consistency**: Follow existing schema patterns in codebase
</principles>
