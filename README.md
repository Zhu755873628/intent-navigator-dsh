# Intent Navigator for DeepSeek Harness

Early implementation of a task-entry plugin for DeepSeek Harness. It adds task-brief tools, a navigation policy, pre-step state context, and a pre-execution authorization gate.

## Current milestone

Implemented and tested:

- Cordis bundle and plugin lifecycle;
- navigation state machine;
- clear-task fast-pass policy;
- `intent_status`;
- `intent_prepare_brief`;
- `intent_authorize`;
- authorization bound to the exact brief revision;
- automatic authorization invalidation after brief revision;
- pre-step navigation context injection;
- fail-closed gate for side-effecting or unknown tools before authorization;
- pass-through to downstream DSH policies after authorization.

Not yet production-ready:

- persistent SQLite store (the current store is process memory);
- cryptographically/verifiably binding `explicit_user_confirmation` to the DSH User Questions reply;
- complete `intent_assess` schema and diagnosis persistence;
- configurable tool classification and modes;
- custom Web task-brief card;
- compatibility tests against more than DSH `0.2.0-rc.2`.

## Requirements

- Node.js `^22.19.0` or `>=24.0.0`;
- DeepSeek Harness package train `0.2.0-rc.2`;
- `@deepseek-ai/cordis ~4.0.4`.

DSH is a developer preview. This package intentionally pins one tested release train.

## Development

```sh
npm install
npm run typecheck
npm test
npm run build
npm pack --dry-run
```

## Local installation

Build and pack:

```sh
npm install
npm run build
npm pack
```

Then install the generated tarball into a DSH profile:

```sh
dsh plugin --profile web add /absolute/path/to/intent-navigator-dsh-plugin-0.1.0.tgz
```

Restart that profile after installation. Do not use this prototype as the only approval boundary for production, destructive, financial, credential, or publication operations.

## Architecture

The plugin uses public DSH extension points only:

- `ctx.systemPrompt.section()` for stable navigation policy;
- `agent/pre-step` for durable model-visible navigation snapshots;
- `ctx.tools.register()` for task-brief and status operations;
- `tools/pre-execute` as an ordering-preserving policy gate.

An allowed call always delegates with `next()`, so DSH sandbox, approval, and other tool policies remain authoritative.
