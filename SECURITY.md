# Security Policy

Stackfold inspects source codebases and architectural evidence. Local analysis is the default. The boundaries below describe intended handling; they are not a security certification or a guarantee that source files contain no sensitive data.

---

## Reporting a Vulnerability

Please **do not** open public GitHub issues for sensitive security bugs.

If you discover a security vulnerability, please report it privately:
- Through the repository's [private vulnerability reporting form](https://github.com/AminSS99/StackFold/security/advisories/new).

Please include:
1. A description of the vulnerability and its potential impact.
2. Step-by-step reproduction instructions or a minimal proof-of-concept repository.
3. Your proposed fix or remediation (if any).

Keep private repository files, credentials, and scan evidence out of public issues. A maintainer will coordinate investigation and disclosure through the private report.

---

## Security Model

### 1. Local-First Boundary
Local-mode scanning runs on your machine. Optional cloud snapshot saving/sharing in configured web deployments sends the selected graph and its evidence to the configured backend. Graphs can include source snippets and paths; review them before upload or sharing. Explicit live probes contact configured test targets. Desktop local mode disables cloud controls.

### 2. Environment References and Sensitive Evidence
- Active environment configuration files (`.env`, `.env.local`, `.env.production`, etc.) are explicitly excluded from file traversal.
- The scanner detects environment-reference names and usage sites (e.g., `process.env.DATABASE_URL`, `.env.example`). These reference nodes do not contain environment values. Source evidence and example files may still contain hard-coded sensitive content; inspect exports before sharing.
- Any environment variable node in the graph contains only the variable key and reference call-sites.
- Explicit Cache Isolation and Signature Compatibility probes read the configured synthetic test credentials from the process environment. Use dedicated test accounts and targets. Probe reports redact credential values; this is distinct from ordinary source evidence.

### 3. Path Traversal & System Root Restrictions
- The Rust native desktop layer canonicalizes all paths using physical filesystem resolution.
- Requests to scan system roots (`/`, `/System`, `/private`, `/etc`, `/var`, `/usr`, `/bin`, `C:\`, `C:\Windows`) are rejected with `FORBIDDEN_SYSTEM_ROOT`.
- Deep links to external editors (VS Code, Cursor, WebStorm) validate that the target file resides strictly within the selected project root and contains no `..` traversal sequences.

### 4. Content Security Policy & Webview Sandboxing
The Tauri desktop window enforces an active Content Security Policy (CSP):
```text
default-src 'self';
script-src 'self' 'unsafe-inline';
style-src 'self' 'unsafe-inline';
img-src 'self' data: https:;
font-src 'self' data:;
connect-src 'self' ipc:;
```
Direct OS access is strictly confined to registered, typed Tauri IPC commands. Arbitrary shell execution or arbitrary file reading is prevented.

### 5. Memory & Process Bounding
- The scanner sidecar streams JSON newline messages, and the desktop reader caps stream reading at a maximum size boundary (64 MB) to prevent denial-of-service or memory exhaustion on large repositories.
- Process PIDs are tracked atomically, ensuring that child scanner sidecars are cleanly terminated upon cancellation or application exit.
