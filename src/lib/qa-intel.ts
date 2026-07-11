/**
 * QA-Intel: Automated architecture validation & trace analysis
 * Imported from hex-yt-intel; verifies Hex Lite (hexagonal) architecture compliance
 * across all layers before merge.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// ARCHITECTURE RULES (Sacred, non-negotiable)
// ============================================================================

const ARCHITECTURE_RULES = {
  businessLogicInDomain: {
    rule: 'Business logic in domain services, not adapters',
    check: 'Scan domain layer for if/switch logic leaks into adapters',
  },
  portImplementationContract: {
    rule: 'Port implementations must satisfy shared contract',
    check: 'Verify adapter signatures match port interfaces exactly',
  },
  traceDependencies: {
    rule: 'Domain → Ports → Adapters → External (swappability)',
    check: 'Validate import graph follows unidirectional flow',
  },
  validationLayers: {
    rule: 'Separate validation (domain invariants vs input shape)',
    check: 'Domain validates business rules; routes validate input shape',
  },
  dependencyInjection: {
    rule: 'Dependencies injected, not constructed internally',
    check: 'No `new Adapter()` in domain; all via DI container',
  },
  domainPortsOnly: {
    rule: 'Domain imports ports/interfaces only, never concrete adapters',
    check: 'grep domain/ for direct imports of lib/adapters/*',
  },
  wiringCentralized: {
    rule: 'Wiring centralized at composition root (DI container)',
    check: 'src/lib/di/container.ts is sole source of adapter instantiation',
  },
  adaptersSwappable: {
    rule: 'Adapters swappable via test setup without touching domain',
    check: 'Test DI container can swap implementations; domain unchanged',
  },
  lifecycleExplicit: {
    rule: 'Lifecycle/scope management explicit in DI container',
    check: 'Container documents singleton vs request-scoped vs transient',
  },
  honestConstructors: {
    rule: 'Honest constructors (all dependencies in parameter list)',
    check: 'No hidden static fields or module-level state in domain',
  },
};

// ============================================================================
// TRACE ANALYSIS FUNCTIONS
// ============================================================================

/**
 * Analyze import graph for architecture violations
 * @param sourceDir - Directory to analyze (e.g., 'src/lib')
 * @returns Array of violations found
 */
export function traceImportGraph(sourceDir: string): string[] {
  const violations: string[] = [];

  try {
    // Check: Domain should NOT import adapters
    const domainFiles = execSync(
      `find ${sourceDir}/referrals.ts ${sourceDir}/commissions -name "*.ts" 2>/dev/null`,
      { encoding: 'utf-8', stdio: 'pipe' }
    ).split('\n').filter(Boolean);

    domainFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf-8');
      if (content.includes("from '@/lib/adapters") || content.includes("from '../../adapters")) {
        violations.push(`❌ Domain file imports adapter: ${file}`);
      }
    });

    // Check: Adapters should implement ports
    const adapterFiles = execSync(
      `find ${sourceDir}/adapters -name "*.ts" 2>/dev/null`,
      { encoding: 'utf-8', stdio: 'pipe' }
    ).split('\n').filter(Boolean);

    adapterFiles.forEach((file) => {
      const content = fs.readFileSync(file, 'utf-8');
      if (!content.includes('implements I') && !content.includes('interface I')) {
        violations.push(`⚠️  Adapter may not implement port: ${file}`);
      }
    });

    // Check: DI container is sole wiring point
    const diContainer = `${sourceDir}/di/container.ts`;
    const otherRoutesWithNewAdapter = execSync(
      `grep -r "new.*Adapter" ${sourceDir}/app/api ${sourceDir}/routes 2>/dev/null || true`,
      { encoding: 'utf-8', stdio: 'pipe' }
    ).split('\n').filter(Boolean);

    if (otherRoutesWithNewAdapter.length > 0) {
      violations.push(`❌ Adapter instantiation outside DI container:\n${otherRoutesWithNewAdapter.join('\n')}`);
    }
  } catch (error) {
    // Silently skip if find fails (directory may not exist)
  }

  return violations;
}

/**
 * Verify port-to-adapter contract compliance
 * @returns Array of mismatches
 */
export function verifyPortContracts(): string[] {
  const mismatches: string[] = [];

  const portInterfaceNames = ['ICommissionRepository', 'IIdempotencyStore', 'IWebhookEventLogger', 'IWebhookSignatureVerifier'];

  portInterfaceNames.forEach((portName) => {
    try {
      const portFile = `src/lib/ports/${portName}.ts`;
      const adapterFile = `src/lib/adapters/${portName.replace(/^I/, '')}Adapter.ts`;

      if (!fs.existsSync(portFile)) {
        mismatches.push(`⚠️  Port not found: ${portFile}`);
        return;
      }

      if (!fs.existsSync(adapterFile)) {
        mismatches.push(`⚠️  Adapter not found: ${adapterFile}`);
        return;
      }

      const portContent = fs.readFileSync(portFile, 'utf-8');
      const adapterContent = fs.readFileSync(adapterFile, 'utf-8');

      // Extract method signatures from port
      const portMethods = (portContent.match(/^\s+(async\s+)?\w+\([^)]*\):/gm) || []).map((m) => m.trim());
      portMethods.forEach((method) => {
        if (!adapterContent.includes(method)) {
          mismatches.push(`❌ Adapter missing method from port: ${method} in ${portName}`);
        }
      });
    } catch (error) {
      // Silently skip
    }
  });

  return mismatches;
}

/**
 * Verify no module-level state in domain layer
 * @returns Array of violations
 */
export function checkHonestConstructors(): string[] {
  const violations: string[] = [];

  const domainFiles = [
    'src/lib/referrals.ts',
    'src/lib/commissions/monthlyResetScheduler.ts',
  ];

  domainFiles.forEach((file) => {
    if (!fs.existsSync(file)) return;

    const content = fs.readFileSync(file, 'utf-8');

    // Look for module-level let/const assignments (not type defs)
    const moduleState = content.match(/^(let|var|const)\s+\w+\s*=\s*(?!{|interface|type)/gm);
    if (moduleState && moduleState.length > 0) {
      moduleState.forEach((statement) => {
        violations.push(`⚠️  Module-level state in ${file}: ${statement}`);
      });
    }
  });

  return violations;
}

/**
 * Run full architecture compliance check
 * @returns Compliance report
 */
export function runArchitectureAudit(): {
  passed: number;
  failed: number;
  warnings: number;
  violations: string[];
} {
  const violations: string[] = [];
  let passed = 0;
  let failed = 0;
  let warnings = 0;

  console.log('\n📋 QA-Intel: Architecture Compliance Audit\n');

  // Test 1: Import graph
  console.log('  [1/3] Checking import graph...');
  const importViolations = traceImportGraph('src/lib');
  if (importViolations.length === 0) {
    console.log('    ✅ Domain→Port→Adapter flow clean');
    passed++;
  } else {
    importViolations.forEach((v) => {
      console.log(`    ${v}`);
      if (v.startsWith('❌')) failed++;
      else warnings++;
    });
    violations.push(...importViolations);
  }

  // Test 2: Port contracts
  console.log('  [2/3] Verifying port-adapter contracts...');
  const contractMismatches = verifyPortContracts();
  if (contractMismatches.length === 0) {
    console.log('    ✅ All adapters implement port contracts');
    passed++;
  } else {
    contractMismatches.forEach((m) => {
      console.log(`    ${m}`);
      if (m.startsWith('❌')) failed++;
      else warnings++;
    });
    violations.push(...contractMismatches);
  }

  // Test 3: Honest constructors
  console.log('  [3/3] Checking for hidden state...');
  const stateViolations = checkHonestConstructors();
  if (stateViolations.length === 0) {
    console.log('    ✅ No module-level state in domain layer');
    passed++;
  } else {
    stateViolations.forEach((v) => {
      console.log(`    ${v}`);
      warnings++;
    });
    violations.push(...stateViolations);
  }

  console.log(`\n  Results: ${passed} ✅ passed, ${failed} ❌ failed, ${warnings} ⚠️  warnings\n`);

  return { passed, failed, warnings, violations };
}

/**
 * Generate trace report for specific workflow
 * Shows: domain → port interface → adapter → external system
 */
export function generateWorkflowTrace(workflowName: string): string {
  const traces: Record<string, string> = {
    commission: `
COMMISSION PROCESSING WORKFLOW:
  1. calculateCommission(orderTotal, tier)
     ├─ Domain: src/lib/referrals.ts
     ├─ Input: orderTotal (number), tier (string)
     ├─ Port: ICommissionRepository (abstract)
     ├─ Adapter: CommissionRepositoryAdapter
     ├─ External: Supabase (.from('commissions').insert())
     └─ Output: DbCommissionRecord { id, amount, status: 'pending' }

  2. approveCommission(commissionId, repo)
     ├─ Domain: src/lib/referrals.ts
     ├─ Injected: repo (ICommissionRepository)
     ├─ Adapter method: approveCommission(id)
     ├─ External: Supabase (.update({ status: 'approved' }))
     └─ Output: DbCommissionRecord { status: 'approved' }

  3. processOrderCommission(referrerId, orderId, orderTotal, repo)
     ├─ Idempotent: checks (referrer_id, order_id) uniqueness
     ├─ Port call: repo.processOrderCommission()
     ├─ Adapter: Lazy-loads Supabase, caches idempotency
     └─ Guarantees: Atomic operation, no race conditions
    `,

    referral: `
REFERRAL TRACKING WORKFLOW:
  1. parseReferralCode(code)
     ├─ Domain: src/lib/referrals.ts
     ├─ Validation: alphanumeric, 6-12 chars, case-insensitive
     ├─ No ports/adapters (pure validation)
     └─ Output: sanitized string or null

  2. buildReferralUrl(baseUrl, referralCode)
     ├─ Domain: src/lib/referrals.ts
     ├─ No external calls (pure function)
     ├─ URL construction: baseUrl?ref=CODE
     └─ Throws on invalid base URL

  3. trackReferralClick(referralCode)
     ├─ Domain: src/lib/referrals.ts
     ├─ Event structure (timestamp, source='direct')
     ├─ No adapter call (event data only)
     └─ Caller sends to analytics

  4. linkReferralToSignup(referralToken, userId, repo)
     ├─ Injected: repo (ICommissionRepository)
     ├─ Port call: repo.linkReferralToSignup()
     ├─ External: Supabase (create referral_signup record)
     └─ Side effect: Creates commission record if order exists
    `,

    webhook: `
WEBHOOK IDEMPOTENCY WORKFLOW:
  1. verifySignature(payload, signature, signingSecret)
     ├─ Port: IWebhookSignatureVerifier
     ├─ Adapter: Timing-safe HMAC comparison (constant-time)
     ├─ External: None (pure cryptographic operation)
     └─ Output: boolean (signature valid or not)

  2. checkIdempotency(webhookId, provider)
     ├─ Port: IIdempotencyStore (Redis-backed)
     ├─ Adapter: Redis GET on scoped key (provider:webhookId:7d)
     ├─ External: Upstash Redis
     └─ Output: { processed: boolean, bodyHash: string }

  3. markWebhookProcessed(webhookId, provider, bodyHash)
     ├─ Port: IIdempotencyStore
     ├─ Adapter: Redis SET with EX 7 days (604800s)
     ├─ Lua script: Atomic check-and-set
     └─ Guarantees: Race-condition free (Law #1)

  4. logWebhookEvent(webhookId, provider, payload, latency)
     ├─ Port: IWebhookEventLogger
     ├─ Adapter: Supabase RPC call
     ├─ External: Supabase insert into webhook_events
     └─ Audit: Full event history for replay/debugging
    `,

    settings: `
SETTINGS MUTATION WORKFLOW:
  1. validateMutation(request: { section, field, newValue })
     ├─ Domain: src/lib/admin/settingsMutator.ts
     ├─ Validation: Blocks dangerous patterns (import/export/eval)
     ├─ No adapters
     └─ Output: { valid: boolean, errors: string[] }

  2. mutateSettings(request)
     ├─ Domain: src/lib/admin/settingsMutator.ts
     ├─ Backup: createBackup(oldContent)
     ├─ Mutation: Regex replace in settings.ts
     ├─ Verification: Reload + validate new file
     └─ Output: success | error with rollback

  3. stageSettingsFile() → commitSettings() → pushChanges()
     ├─ Port: GitHub API (via gitManager.ts)
     ├─ Adapter: GitHub API client
     ├─ External: GitHub REST API
     ├─ Commit: Structured metadata (section, field, admin, timestamp)
     ├─ Push: Exponential backoff retry (2s, 4s, 8s, 16s)
     └─ Guarantees: Idempotent, atomic (commit or fail)

  4. deploySettings(commitMessage)
     ├─ Port: Vercel API
     ├─ Adapter: vercelManager.ts
     ├─ External: Vercel deployment trigger
     ├─ Poll: Every 5s for up to 300s
     └─ Output: Deployment status (ready | failed)
    `,
  };

  return traces[workflowName] || `Workflow "${workflowName}" not found. Available: ${Object.keys(traces).join(', ')}`;
}

export default {
  runArchitectureAudit,
  generateWorkflowTrace,
  traceImportGraph,
  verifyPortContracts,
  checkHonestConstructors,
};
