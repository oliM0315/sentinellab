# Sentinellab

Build SentinelLab: Cyber Attack Detection & Incident Response Simulator, an interactive blue team SOC training and incident response platform based on the attached project specification and incorporating these four key refinements:

1. Concrete MITRE ATT&CK Chains (multi-stage attack scenarios):
- Scenario 1: Credential Stuffing & Account Takeover (Recon/Initial Access T1110.004 -> Valid Accounts T1078 -> Privilege Escalation T1068 -> Impact)
- Scenario 2: Lateral Movement & Data Exfiltration (Compromised Workstation -> Internal Port Scan -> Sensitive File Access -> Staged Upload)

2. Formalized Correlation Engine:
- Composite Entity Keys linking events sharing username, source_ip, or asset_id
- Sliding time window (e.g. delta t <= 10 min)
- State machine transitioning from NORMAL -> SUSPICIOUS -> INCIDENT_CRITICAL

3. Actionable Incident Response (Simulated SOAR):
- Containment actions: Isolate Host (LAB-PC-01), Terminate Active Sessions, Temporary IP Block
- Remediation actions: Force Password Reset, Revoke Admin Role
- Feedback loop: Containment actions immediately block subsequent simulated events from that entity, logging them as BLOCKED_BY_POLICY

4. Objective Student Scoring (MTTD / MTTR / Accuracy):
- Mean Time to Detect (MTTD) and Mean Time to Respond (MTTR) tracking
- Root cause & scope accuracy assessment
- False positive penalties

Core Platform Modules:
- Security Operations Center (SOC) Dashboard with live event feed, severity breakdown, active incidents, and attack simulator injector
- Log Analysis & Normalization Engine: search, filter, and normalize raw logs
- Detection Rules Manager: configure thresholds, severity, time windows, toggle rules
- Incident Investigation Workspace: event timeline, evidence viewer, analyst notes, containment/remediation controls
- Training & CTF Scenarios: interactive guided exercises with scoring metrics
- Incident Reporting: structured report export with executive summary, timeline, and remediation recommendations

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://sentinellab.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/a7c99149-6717-40fd-90cb-880dc3384918).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
