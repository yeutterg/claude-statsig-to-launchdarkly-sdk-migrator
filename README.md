# Claude Code Subagent: Statsig to LaunchDarkly SDK Migration

A Claude Code subagent that automates the migration from the Statsig SDK to LaunchDarkly SDK. Focused on JavaScript/React Client SDKs to start.

## Overview

This agent helps developers migrate their feature gate, dynamic config, session replay, and auto capture implementations from Statsig to LaunchDarkly by:
- Converting import statements to LDclient, LDcontext, and LD observability SDK
- Converting feature gates to boolean flags, with false as the default fallback value
- Migrating dynamic configs to JSON flags, with a JSON fallback value
- Transforming StatsigUser objects to LDContext objects
- Porting observability features (session replay, autocapture) to the LaunchDarkly Observability SDK
- Identifying compatibility issues and required manual interventions

## Repository Structure

```
.
├── .claude/
│   └── agents/
│       └── statsig-to-launchdarkly-sdk-migrator.md  # The Claude Code agent
├── tests/
│   ├── examples/                                    # Example migration cases
│   └── fixtures/                                    # Test input/output files
├── README.md                                         # This documentation
├── LICENSE                                           # MIT License
└── .gitignore                                       # Git ignore rules
```

**Note:** Only the `statsig-to-launchdarkly-sdk-migrator.md` file is needed for Claude Code. The tests directory contains examples and test cases for validation.

## Key Features

### Automated Conversions

#### Import Statements
```javascript
// Core SDK - CommonJS
const statsig = require('statsig-js');
// → 
const LDClient = require('launchdarkly-js-client-sdk');

// Core SDK - ES2015/ES6 Modules
import statsig from 'statsig-js';
// →
import { initialize } from 'launchdarkly-js-client-sdk';

// TypeScript
import { Statsig, StatsigUser } from 'statsig-js';
// →
import { initialize } from 'launchdarkly-js-client-sdk';
// Context type is implicit in the object structure

// React SDK - Statsig
import { StatsigProvider, useGateValue, useConfig } from '@statsig/react-bindings';
// → LaunchDarkly
import { asyncWithLDProvider, withLDProvider } from 'launchdarkly-react-client-sdk';
import { useFlags, useLDClient } from 'launchdarkly-react-client-sdk';

// Observability - ONLY if you currently use these features
// Statsig:
import { StatsigAutocapture } from '@statsig/web-analytics';  // Autocapture
import { StatsigSessionReplay } from '@statsig/session-replay';  // Session replay
// → LaunchDarkly (only add if you use above features):
import Observability, { LDObserve } from '@launchdarkly/observability';  // For autocapture
import SessionReplay, { LDRecord } from '@launchdarkly/session-replay';  // For session replay
```

#### Feature Gates → Boolean Flags

**Important:** Flag naming depends on the LaunchDarkly SDK:
- **React SDK only**: Automatically converts to camelCase (`new_feature` → `newFeature`)
- **All other SDKs**: Use exact flag names (`new_feature` stays `new_feature`)

```javascript
// Statsig
if (statsig.checkGate("new_feature")) { }

// LaunchDarkly - JavaScript SDK (no conversion)
if (client.variation("new_feature", false)) { }

// LaunchDarkly - React SDK (automatic camelCase)
const flags = useFlags();
if (flags.newFeature) { }  // Note: automatic conversion
```

#### Dynamic Configs → JSON Flags
```javascript
// Statsig
const config = statsig.getConfig("homepage_config");
const title = config.get("title", "Default");

// LaunchDarkly - JavaScript SDK (no conversion)
const config = client.jsonVariation("homepage_config", { title: "Default" });
const title = config.title;

// LaunchDarkly - React SDK (automatic camelCase)
const flags = useFlags();
const config = flags.homepageConfig ?? { title: "Default" };
const title = config.title;
```

#### User Context Migration

StatsigUser objects must be transformed to LaunchDarkly contexts:
- `userID` → `key` (required)
- `custom` properties → flattened to top level
- `privateAttributes` → `_meta.privateAttributes` array
- Add `kind: 'user'` field

```javascript
// Statsig User
const statsigUser = {
  userID: "user-123",
  email: "anna@example.com",
  custom: { organization: "Global Health", tier: "premium" },
  privateAttributes: { salary: 100000 }
};

// LaunchDarkly Context (JavaScript)
const context = {
  kind: "user",
  key: "user-123",
  email: "anna@example.com",
  organization: "Global Health",  // custom properties flattened
  tier: "premium",
  salary: 100000,
  _meta: { privateAttributes: ["salary"] }
};

// LaunchDarkly Context (TypeScript)
const context: LDClient.LDContext = {
  kind: "user",
  key: "user-123",
  // ... same structure
};
```

#### Initialization & Observability
```javascript
// Statsig initialization with built-in session replay
await statsig.initialize('client-sdk-key', statsigUser);

// LaunchDarkly initialization - JavaScript
const LDClient = require('launchdarkly-js-client-sdk');
const Observability = require('@launchdarkly/observability');
const SessionReplay = require('@launchdarkly/session-replay');

const context = {
  kind: 'user',
  key: 'context-key-123abc'
};

const client = LDClient.initialize('client-side-id-123abc', context, {
  // the observability plugins require JS SDK v3.7+
  plugins: [
    new Observability({
      // Network recording and tracing options
      tracingOrigins: true,
      networkRecording: {
        enabled: true,
        recordHeadersAndBody: true
      }
    }),
    new SessionReplay({
      // LaunchDarkly SessionReplay configuration  
      privacySetting: 'default'  // Options: 'none', 'default', 'strict'
      // Note: Parameters differ from Statsig:
      // - Statsig: maxSessionDurationMs, recordConsoleErrors, privacyMask
      // - LaunchDarkly: privacySetting only
    })
  ]
});

try {
  await client.waitForInitialization(5);
  proceedWithSuccessfullyInitializedClient();
} catch(err) {
  // Client failed to initialized or timed out
  // variation() calls return fallback values until initialization completes
}

// LaunchDarkly initialization - TypeScript
const context: LDClient.LDContext = {
  kind: 'user',
  key: 'context-key-123abc'
};

const client = LDClient.initialize('client-side-id-123abc', context, {
  // the observability plugins require JS SDK v3.7+
  plugins: [
    new Observability({
      // Network recording and tracing options
      tracingOrigins: true,
      networkRecording: {
        enabled: true,
        recordHeadersAndBody: true
      }
    }),
    new SessionReplay({
      // LaunchDarkly SessionReplay configuration  
      privacySetting: 'default'  // Options: 'none', 'default', 'strict'
      // Note: Parameters differ from Statsig:
      // - Statsig: maxSessionDurationMs, recordConsoleErrors, privacyMask
      // - LaunchDarkly: privacySetting only
    })
  ]
});

try {
  await client.waitForInitialization(5);
  proceedWithSuccessfullyInitializedClient();
} catch(err) {
  // Client failed to initialized or timed out
  // variation() calls return fallback values until initialization completes
}
```

## Important Migration Considerations

### SDK-Specific Flag Naming Behavior

**CRITICAL**: Different LaunchDarkly SDKs handle flag names differently:

| SDK | Auto camelCase | Example: `admin_panel_access` becomes | Configuration |
|-----|---------------|---------------------------------------|---------------|
| **React** | Yes (default) | `adminPanelAccess` | `useCamelCaseFlagKeys: false` to disable |
| **JavaScript** | No | `admin_panel_access` | N/A |
| **Node.js** | No | `admin_panel_access` | N/A |
| **Python** | No | `admin_panel_access` | N/A |
| **Go** | No | `admin_panel_access` | N/A |
| **Java** | No | `admin_panel_access` | N/A |
| **iOS/Android** | No | `admin_panel_access` | N/A |

**Recommendations:**
- When migrating React apps, expect automatic camelCase conversion
- For all other SDKs, maintain original flag names from LaunchDarkly
- Consider creating flags in LaunchDarkly using camelCase from the start to avoid confusion

### Session Replay Parameter Mapping

⚠️ **IMPORTANT**: Statsig and LaunchDarkly have different parameter structures for Session Replay:

#### Statsig Session Replay Parameters:
```javascript
new StatsigSessionReplayPlugin({
  maxSessionDurationMs: 1800000,  // Session duration limit
  recordConsoleErrors: true,       // Console error recording
  privacyMask: true                // Privacy masking
})
```

#### LaunchDarkly Session Replay Parameters:
```javascript
new SessionReplay({
  privacySetting: 'default'  // Options: 'none', 'default', 'strict'
  // LaunchDarkly does NOT support:
  // - maxSessionDurationMs
  // - recordConsoleErrors
  // - Other Statsig-specific parameters
})
```

**Migration Notes:**
- `privacyMask: true` in Statsig → `privacySetting: 'default'` or `'strict'` in LaunchDarkly
- `privacyMask: false` in Statsig → `privacySetting: 'none'` in LaunchDarkly
- Session duration and console error recording must be configured differently in LaunchDarkly
- Event filtering in Observability plugin works differently between platforms

### Critical Rules
1. **Fallback Values**: Boolean flags MUST use `false` as fallback to match Statsig's default behavior
2. **Dynamic Configs**: Always provide complete JSON objects as fallbacks
3. **Experiments**: NOT migrated - preserved in Statsig with warnings
4. **Flag Defaults**: Set default on/off values in LaunchDarkly UI, not in code
5. **Syntax Accuracy**: Exact method name conversions are critical
6. **Parallel Operation**: If experiments exist, both SDKs run simultaneously

### Experiment Handling

⚠️ **IMPORTANT**: If your codebase contains experiments:
- Statsig imports will be PRESERVED alongside LaunchDarkly imports
- Feature gates involved in experiments will NOT be migrated
- Both SDKs will operate in parallel during transition
- Manual experiment recreation in LaunchDarkly is required

Example of parallel SDK operation:
```javascript
// Both imports remain when experiments are detected
import statsig from 'statsig-js';  // Kept for experiments
import { initialize } from 'launchdarkly-js-client-sdk';  // Added for migrated flags

// Some flags use Statsig (experiments)
if (statsig.getExperiment("checkout_test").get("enabled")) { }

// Other flags use LaunchDarkly (migrated)
if (client.variation("new-feature", false)) { }
```

### What's NOT Migrated
- Experiments (`statsig.getExperiment()`) - preserved with warnings
- Feature gates that are part of experiments - blocked from migration
- Complex targeting rules (require manual LaunchDarkly dashboard configuration)
- Statsig-specific features without direct LaunchDarkly equivalents

## Installation

This agent is designed to be used with Claude Code. You only need to download the agent file to your local `.claude/agents/` directory.

### Quick Install

```bash
# Create the agents directory if it doesn't exist
mkdir -p ~/.claude/agents/

# Download the agent file directly from this repository
curl -o ~/.claude/agents/statsig-to-launchdarkly-sdk-migrator.md \
  https://raw.githubusercontent.com/yeutterg/claude-statsig-to-launchdarkly-sdk-migrator/main/.claude/agents/statsig-to-launchdarkly-sdk-migrator.md
```

### Alternative Methods

#### Using wget:
```bash
mkdir -p ~/.claude/agents/
wget -O ~/.claude/agents/statsig-to-launchdarkly-sdk-migrator.md \
  https://raw.githubusercontent.com/yeutterg/claude-statsig-to-launchdarkly-sdk-migrator/main/.claude/agents/statsig-to-launchdarkly-sdk-migrator.md
```

#### Manual Download:
1. Navigate to `.claude/agents/statsig-to-launchdarkly-sdk-migrator.md` in this repository
2. Click "Raw" to view the raw file
3. Save the file to your local `~/.claude/agents/` directory
4. Ensure the file has the `.md` extension

### Verify Installation

After downloading, you can verify the agent is installed:
```bash
ls -la ~/.claude/agents/statsig-to-launchdarkly-sdk-migrator.md
```

The agent will be immediately available in Claude Code. If Claude Code is already running, you may need to restart it.

## Usage

When working with Claude Code, you can invoke the agent when you need to migrate Statsig code:

```
"I need to migrate this code from the Statsig SDK the LaunchDarkly SDK: [filename]
```

The agent will:
1. Detect and preserve any experiments
2. Analyze your Statsig implementation
3. Convert safe feature gates and dynamic configs to LaunchDarkly
4. Provide migration notes and warnings
5. Generate a detailed migration report (JSON)
6. List manual steps required
7. Suggest verification steps

### Migration Report

The agent generates a `migration-summary.json` file containing:
- Summary statistics (total items, migrated, blocked, failed)
- Detailed list of migrated feature gates and configs
- List of experiments and blocked items with reasons
- Warnings about parallel SDK operation
- Clear next steps for completing migration

Example report structure:
```json
{
  "summary": {
    "total_items": 25,
    "successfully_migrated": 18,
    "blocked_by_experiments": 5,
    "failed": 2
  },
  "not_migrated": {
    "experiments": [
      {
        "name": "checkout_flow_test",
        "affected_gates": ["express_checkout", "new_payment_flow"]
      }
    ]
  }
}
```

## Testing Your Migration

### Pre-Migration Checklist
- [ ] Inventory all Statsig feature gates and dynamic configs
- [ ] Document current flag states and configurations
- [ ] **Identify all active experiments** (these will block related flags)
- [ ] Note which feature gates are part of experiments
- [ ] Identify observability features in use
- [ ] Map all user properties and custom IDs
- [ ] Plan timeline for experiment migration

### Post-Migration Testing
1. **Parallel Testing**: Run both SDKs side-by-side temporarily
2. **Fallback Testing**: Verify behavior when flags are unavailable
3. **Observability Verification**: Confirm session replay and autocapture work
4. **Performance Monitoring**: Check SDK initialization time and flag evaluation latency

### Sample Test Suite
```javascript
describe('Migration Validation', () => {
  test('Boolean flags return false when unavailable', async () => {
    const result = await ldClient.variation('unavailable-flag', false);
    expect(result).toBe(false);
  });
  
  test('JSON flags return complete fallback objects', async () => {
    const fallback = { enabled: false, title: "Default" };
    const result = await ldClient.jsonVariation('missing-config', fallback);
    expect(result).toEqual(fallback);
  });
});
```

## Requirements

- LaunchDarkly JavaScript SDK 3.7.0+ (for observability features)
- Claude Code for agent usage

## Support

For issues or questions about this migration agent:
- Create an issue at https://github.com/yeutterg/claude-statsig-to-launchdarkly-sdk-migrator/issues
- Consult the official documentation:
  - [Statsig JavaScript SDK](https://docs.statsig.com/client/javascript-sdk/)
  - [LaunchDarkly JavaScript SDK](https://docs.launchdarkly.com/sdk/client-side/javascript)
  - [LaunchDarkly Observability SDK](https://launchdarkly.com/docs/sdk/observability/javascript)

## License

[MIT License](LICENSE)

## Contributing

Contributions are welcome! Please submit pull requests with:
- Updated migration patterns
- Additional test cases
- Documentation improvements
- Bug fixes
