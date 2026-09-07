# Security Policy

Stackfold treats security and confidentiality as foundational product requirements. Because Stackfold inspects source codebases and architectural layouts, it is designed from the ground up to guarantee local privacy and zero credential leakage.

---

## Reporting a Vulnerability

Please **do not** open public GitHub issues for sensitive security bugs.

If you discover a security vulnerability, please report it privately:
- Through **GitHub Security Advisories** on the repository ("Report a vulnerability").
- Or by emailing: **security@stackfold.dev**

Please include:
1. A description of the vulnerability and its potential impact.
2. Step-by-step reproduction instructions or a minimal proof-of-concept repository.
3. Your proposed fix or remediation (if any).

We will acknowledge your report within 48 hours and work with you on a coordinated disclosure timeline.

---

## Security Model & Guarantees

### 1. Local-First Boundary
Stackfold analyzes source code entirely on your local machine. Source code, ASTs, and architecture graphs are never sent to external servers or third-party cloud services.

### 2. Zero Secrets Ingestion
- Active environment configuration files (`.env`, `.env.local`, `.env.production`, etc.) are explicitly excluded from file traversal.
- The scanner detects variable names and usage sites (e.g., `process.env.DATABASE_URL`, `.env.example`), but **never reads, logs, caches, or displays secret values**.
- Any environment variable node in the graph contains only the variable key and reference call-sites.

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
