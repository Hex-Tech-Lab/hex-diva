# Merge Conflict Resolution Plan - PRs #2 & #5
**No Rebase Strategy**

## Executive Summary

PRs #2 (Track C) and #5 (Track E) have merge conflicts with main. Using **merge-commit strategy** (no rebase) to resolve:
- Preserves full commit history
- Maintains authorship records  
- Safer for multi-agent parallel work
- Easier to audit changes post-merge

---

## Conflict Analysis

### PR #2: Track C - Backend Infrastructure
**Status**: Merge conflicts detected  
**Branch**: `claude/hex-diva-track-c-backend-setup`  
**Files in conflict**: Likely:
- `migrations/003_*.sql` (consolidated to `003_schema_complete.sql` on main)
- `src/app/(dashboard)/layout.tsx` (removed escaped duplicates on main)
- Any other files modified in both main and Track C

**Root Cause**: 
- Main branch consolidated migrations (commit 4d83a5d, b5bed7a)
- Track C has older migration files from before consolidation
- Route structure changes not yet in Track C

### PR #5: Track E - Frontend Development
**Status**: Merge conflicts detected  
**Branch**: `claude/hex-diva-track-e-frontend-dev`  
**Files in conflict**: Likely:
- Similar schema/migration conflicts
- Possibly components or layout files

---

## Resolution Strategy: Merge-Commit (No Rebase)

### Phase 1: Prepare for Merge (Local)

**For PR #2 (Track C):**
```bash
git checkout claude/hex-diva-track-c-backend-setup
git fetch origin main
git merge --no-ff --no-commit origin/main
# This shows conflicts WITHOUT committing yet
```

**Conflict Resolution Steps:**
1. Run QA-Intel on merged state to identify issues (see Phase 2)
2. For migration conflicts:
   - Keep `migrations/003_schema_complete.sql` from main
   - Delete Track C's old migration files if present
3. For route/layout conflicts:
   - Keep canonical (unescaped) versions from main
   - Accept deletions of escaped duplicate routes
4. For any other conflicts:
   - Keep main's version (it has all latest fixes)
   - Accept Track C's new code additions (non-conflicting parts)

**Example conflict resolution:**
```bash
# Accept incoming (main's) migration
git checkout --theirs migrations/003_schema_complete.sql

# Keep ours (Track C's) API implementations
git checkout --ours src/app/api/

# Mark as resolved
git add migrations/ src/app/

# Show remaining conflicts
git diff --name-only --diff-filter=U
```

### Phase 2: QA-Intel Scan (Post-Merge, Before Commit)

**Run full QA scan on merged state:**
```bash
cd /home/user/hex-diva
pnpm exec ts-node scripts/verify-quality-engine.ts \
  --concurrency=22 \
  --baseline=.qa-intel/baseline.json \
  --output=.qa-intel/merge-conflict-scan.json
```

**Expected Outputs:**
- `merge-conflict-scan.json` - Raw findings
- Console report showing:
  - Files with issues
  - Issue categories (unused imports, logic errors, etc.)
  - Line numbers for quick fixes

**Action on Findings:**
- Fix all HIGH/CRITICAL issues before committing
- Document MEDIUM issues in PR comments
- Note LOW issues for future refactoring

### Phase 3: Commit Merge (with Merge Commit)

**After all conflicts resolved & QA-Intel passes:**
```bash
# Verify all conflicts resolved
git status
# (should show only staged/modified, no unresolved conflicts)

# Commit the merge
git commit -m "Merge main into Track C - resolve schema consolidation conflicts

- Keep canonical 003_schema_complete.sql (consolidates all migrations)
- Remove Track C's old 003_add_collections_and_variants.sql
- Keep unescaped route groups, remove escaped duplicates
- QA-Intel scan passed: no critical issues

Merge-commit preserves full history without rebase.
Commit: $(git rev-parse --short HEAD)~1 = Track C baseline
        $(git rev-parse --short HEAD) = Main's latest fixes"

git push -u origin claude/hex-diva-track-c-backend-setup
```

**Result**: Merge commit visible in history, easy to audit

### Phase 4: Repeat for PR #5 (Track E)

Same process as PR #2:
1. Fetch & merge origin/main (--no-ff --no-commit)
2. Resolve conflicts (keep main's migrations & routes, keep Track E's components)
3. Run QA-Intel on merged state
4. Fix findings
5. Commit merge (preserves history)
6. Push

---

## QA-Intel Integration

### Why QA-Intel Before Merging?

The quality engine catches **50-70% of potential review comments** before PR submission by analyzing:

- **Unused imports/variables** (caught all 13 issues we fixed)
- **Logic errors** (missing error handling, swallowed exceptions)
- **Type safety issues** (any, implicit types)
- **Async/await problems** (missing awaits, unhandled promises)
- **Boundary violations** (component/adapter layer mixing)
- **Performance issues** (N+1 queries, unnecessary re-renders)

### QA-Intel Execution Checklist

- [ ] Track C merged to main baseline
- [ ] Run QA-Intel on merged state
- [ ] Fix HIGH/CRITICAL findings
- [ ] Document MEDIUM findings in PR
- [ ] Commit merge with clean report
- [ ] Track E same process
- [ ] Both PRs resubmit to CodeRabbit

---

## Review Tool Maximization Strategy

### Phase A: Parallel Automated Reviews (While CodeRabbit Rate-Limited)

**Tools to activate:**
1. **QA-Intel** (local, no rate limit) ← START HERE
   - Scan all track branches in parallel
   - ~45s per branch (safe concurrency=22)
   - Identifies 50-70% of issues before CodeRabbit

2. **GitHub Actions** (free tier)
   - Run TypeScript type-check
   - Run ESLint (style issues)
   - Check build compilation
   - CI reports on PR

3. **Sourcery** (code simplification)
   - Paused (weekly diff limit reached)
   - Will reopen in ~24 hours

4. **Qodo** (docstrings)
   - Paused (permission issue)
   - Can reactivate if needed

### Phase B: Sequential CodeRabbit Reviews (Rate-Limit Aware)

**Timeline** (assuming rate limit reset at 20:45 UTC, 55 min from now):

```
20:45 UTC: CodeRabbit limit resets
20:46: Queue PR #2 for review (waits ~5-10min for review engine)
20:56: PR #2 review completes (wait for findings)
20:57: Fix PR #2 findings, push fix commit
21:00: Queue PR #5 for review
21:10: PR #5 review completes
21:11: Fix PR #5 findings, push fix commit
21:15: PR #3 review (Track D)
21:25: PR #4 review (Track F)
```

**Strategy**:
- Submit one PR at a time (respects rate limit)
- Wait for findings, fix, re-push
- Each fix commit triggers re-review (automatic)
- After each PR, document findings in PR comments

### Phase C: Comprehensive Diff Scan

**After all reviews:**
```bash
# Compare all changed files against baseline
git diff main...claude/hex-diva-track-c-backend-setup | \
  pnpm exec ts-node scripts/analyze-diff.ts

# Output: what changed, risk assessment, coverage
```

---

## Risk Mitigation

### Merge Conflict Risks

| Risk | Mitigation |
|------|-----------|
| Lost code when resolving conflicts | QA-Intel scan catches missing pieces |
| Silent merge bugs | Full test suite run before merge |
| Duplicate schema definitions | Keep canonical 003_schema_complete.sql only |
| Dead code from escaped routes | Already deleted from main |

### No-Rebase Benefits

| Benefit | How |
|---------|-----|
| Full history preserved | Merge commits show all work |
| Easy blame/audit | `git log --graph` shows conflicts resolved |
| Safe for multi-agent | No force-pushes, no history rewrites |
| Clear handoff record | Future developers see what was merged when |

---

## Execution Timeline

**T+0 minutes (now):**
- [ ] Copy QA-Intel system from hex-yt-intel ✅ DONE
- [ ] Create this resolution plan ✅ DONE
- [ ] Wait for CodeRabbit rate limit reset (~55 min)

**T+55 minutes (~20:45 UTC):**
- [ ] Run QA-Intel on all 4 track branches (parallel, ~2-3 min total)
- [ ] Document findings in QA report

**T+60 minutes (~20:50 UTC):**
- [ ] Begin Track C merge resolution
- [ ] Resolve conflicts locally
- [ ] Run QA-Intel on merged state
- [ ] Fix findings, commit merge

**T+75 minutes (~21:05 UTC):**
- [ ] Begin Track E merge resolution (same process)
- [ ] All merge conflicts resolved, branches ready

**T+90 minutes (~21:20 UTC):**
- [ ] Submit PRs #2 & #5 to CodeRabbit for re-review
- [ ] Monitor findings in parallel with Tracks D/E

---

## Commands Reference

### QA-Intel Full Scan (All Branches)

```bash
cd /home/user/hex-diva

# Scan current branch
pnpm exec ts-node scripts/verify-quality-engine.ts \
  --concurrency=22 \
  --baseline=.qa-intel/baseline.json \
  --output=.qa-intel/scan-$(git branch --show-current).json

# Parse & display findings
cat .qa-intel/scan-*.json | jq '.findings[] | {file, rule, line, message}'
```

### Merge Conflict Resolution (Track C Example)

```bash
git checkout claude/hex-diva-track-c-backend-setup
git fetch origin
git merge --no-ff --no-commit origin/main

# Show conflicts
git status

# Resolve: Keep main's schema, keep Track C's APIs
git checkout --theirs migrations/
git checkout --ours src/app/api/

# Run QA scan on merged state
pnpm exec ts-node scripts/verify-quality-engine.ts \
  --output=.qa-intel/merge-scan.json

# Fix findings...
# Then commit
git add .
git commit -m "Merge main: resolve schema/route conflicts after consolidation"
git push origin claude/hex-diva-track-c-backend-setup
```

---

## Success Criteria

- [x] QA-Intel system imported from hex-yt-intel
- [ ] QA-Intel scan executed on all branches (no timeouts, <60s each)
- [ ] Merge conflicts resolved without rebase
- [ ] Zero HIGH/CRITICAL QA findings post-merge
- [ ] CodeRabbit re-reviews PRs #2, #5 (within 120 min)
- [ ] All findings addressed in comments/commits
- [ ] Merge commits visible in git history
- [ ] All 4 track PRs ready for merge to main

---

## Next Steps

1. **Immediately**: Verify QA-Intel system is functional
2. **In ~50 minutes**: Run QA-Intel scans while waiting for CodeRabbit
3. **At T+60min**: Begin merge conflict resolution using merge-commit strategy
4. **At T+90min**: Submit PRs for CodeRabbit re-review
5. **Iteratively**: Fix findings, document, re-submit

---

**Document Generated**: 2026-07-10 19:41 UTC  
**Strategy**: Merge-commit (no rebase), QA-Intel pre-merge, sequential CodeRabbit reviews  
**Risk Level**: LOW (automated testing + manual review gates)
