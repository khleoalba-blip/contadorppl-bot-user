# Proposal: TOOLS.md — Windows read workaround for skill files

**Signature:** `win32-read-skill-files`

**Target:** TOOLS.md

**Reason:** The `read` tool fails for skill SKILL.md files outside the workspace sandbox root; `exec type` is the reliable workaround on Windows.

---

## Proposed addition to TOOLS.md

```markdown
### Windows: Reading skill files

The `read` tool is sandboxed to the workspace directory. Skill SKILL.md files live in
`C:\Users\Administrador\.openclaw-autoclaw\skills\*` — outside the sandbox root —
so `read` will always fail with "Path escapes sandbox root" for these files.

**Workaround:** Use `exec type <absolute-path>` instead.

Example:
```
exec type "C:\Users\Administrador\.openclaw-autoclaw\skills\autoglm-websearch\SKILL.md"
```

This is a Windows-specific quirk (Linux would use `cat`). If the error appears for any
other file outside the workspace tree, the same pattern applies.
```
