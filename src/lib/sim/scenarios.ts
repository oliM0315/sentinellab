import type { SimEvent } from "./engine";

export type Draft = Omit<SimEvent, "id" | "ts" | "realTs" | "status" | "alertIds" | "raw"> & { delaySec?: number };

export interface Scenario {
  id: string;
  name: string;
  difficulty: "Intermediate" | "Advanced";
  summary: string;
  chain: { stage: string; technique: string; detail: string }[];
  rootCauseOptions: string[];
  rootCause: string;
  scope: string[]; // entity keys like user:x, ip:y, asset:z
  hints: string[];
  build: () => Draft[];
}

const ATTACKER_IP = "185.220.101.47";
const users = ["jdoe", "asmith", "bwolde", "lhailu", "rgetachew", "selam.t", "dtesfaye", "nabebe", "ktadesse", "yalemu"];

export const SCENARIOS: Scenario[] = [
  {
    id: "S1",
    name: "Credential Stuffing & Account Takeover",
    difficulty: "Intermediate",
    summary: "A leaked credential list is sprayed against the VPN gateway. One account falls, the attacker escalates on LAB-PC-01 and starts destroying finance data.",
    chain: [
      { stage: "Recon / Initial Access", technique: "T1110.004 Credential Stuffing", detail: `Burst of failed logins from ${ATTACKER_IP}` },
      { stage: "Valid Accounts", technique: "T1078", detail: "Successful login as mkebede" },
      { stage: "Privilege Escalation", technique: "T1068", detail: "sudo heap overflow (CVE-2021-3156) on LAB-PC-01 + admin role grant" },
      { stage: "Impact", technique: "T1485 Data Destruction", detail: "Mass deletion of /srv/finance" },
    ],
    rootCauseOptions: [
      "Credential stuffing against VPN leading to account takeover of mkebede",
      "Insider misuse by hgirma after repeated typos",
      "Phishing attachment executed on LAB-PC-01",
      "Misconfigured backup job deleting finance data",
    ],
    rootCause: "Credential stuffing against VPN leading to account takeover of mkebede",
    scope: [`ip:${ATTACKER_IP}`, "user:mkebede", "asset:VPN-GW-01", "asset:LAB-PC-01"],
    hints: [
      "Pivot on the source IP that produces failures across many usernames.",
      "Which account eventually succeeds from that same IP?",
      "Contain the IP and terminate sessions before privilege escalation completes.",
    ],
    build: () => {
      const d: Draft[] = [];
      // benign decoy: a legit user fat-fingering their password (false-positive trap)
      for (let i = 0; i < 5; i++) d.push({ source: "auth", type: "login_failed", user: "hgirma", src_ip: "10.0.2.15", asset: "VPN-GW-01", message: "Failed password for hgirma", malicious: false, scenarioId: "S1", delaySec: 8 });
      d.push({ source: "auth", type: "login_success", user: "hgirma", src_ip: "10.0.2.15", asset: "VPN-GW-01", message: "Accepted password for hgirma", malicious: false, scenarioId: "S1", delaySec: 10 });
      for (let i = 0; i < 12; i++) d.push({ source: "auth", type: "login_failed", user: users[i % users.length], src_ip: ATTACKER_IP, asset: "VPN-GW-01", port: 40000 + i, message: `Failed password for ${users[i % users.length]}`, malicious: true, scenarioId: "S1", delaySec: 4 });
      d.push({ source: "auth", type: "login_failed", user: "mkebede", src_ip: ATTACKER_IP, asset: "VPN-GW-01", message: "Failed password for mkebede", malicious: true, scenarioId: "S1", delaySec: 3 });
      d.push({ source: "auth", type: "login_success", user: "mkebede", src_ip: ATTACKER_IP, asset: "VPN-GW-01", message: "Accepted password for mkebede", malicious: true, scenarioId: "S1", delaySec: 5 });
      d.push({ source: "endpoint", type: "process_start", user: "mkebede", src_ip: ATTACKER_IP, asset: "LAB-PC-01", path: "/usr/bin/whoami", message: "mkebede ran whoami; id; uname -a", malicious: true, scenarioId: "S1", delaySec: 40 });
      d.push({ source: "endpoint", type: "priv_escalation", user: "mkebede", src_ip: ATTACKER_IP, asset: "LAB-PC-01", path: "/usr/bin/sudoedit", message: "sudoedit -s heap overflow (CVE-2021-3156) → uid=0", malicious: true, scenarioId: "S1", delaySec: 60 });
      d.push({ source: "iam", type: "role_grant", user: "mkebede", src_ip: ATTACKER_IP, asset: "LAB-PC-01", message: "mkebede added to group 'Domain Admins'", malicious: true, scenarioId: "S1", delaySec: 45 });
      d.push({ source: "file", type: "mass_delete", user: "mkebede", src_ip: ATTACKER_IP, asset: "LAB-PC-01", path: "/srv/finance/*", message: "rm -rf /srv/finance — 4,812 files deleted", malicious: true, scenarioId: "S1", delaySec: 90 });
      return d;
    },
  },
  {
    id: "S2",
    name: "Lateral Movement & Data Exfiltration",
    difficulty: "Advanced",
    summary: "A workstation infected via a malicious macro beacons out, scans the file server, harvests HR data, stages a 7z archive and uploads it to a VPS.",
    chain: [
      { stage: "Compromised Workstation", technique: "T1071.001 Web C2", detail: "update.exe beacons to 45.77.12.9 every 60s" },
      { stage: "Internal Port Scan", technique: "T1046", detail: "LAB-PC-01 probes FS-01 (10.0.5.30)" },
      { stage: "Sensitive File Access", technique: "T1005 / T1039", detail: "HR salary and Finance shares read" },
      { stage: "Staged Upload", technique: "T1074 → T1048", detail: "7z archive, 480 MB HTTPS upload" },
    ],
    rootCauseOptions: [
      "Malware on LAB-PC-01 used for lateral discovery and exfiltration to 45.77.12.9",
      "Authorized backup job copying HR files offsite",
      "Brute force against FS-01 from the Internet",
      "Credential stuffing on the VPN gateway",
    ],
    rootCause: "Malware on LAB-PC-01 used for lateral discovery and exfiltration to 45.77.12.9",
    scope: ["asset:LAB-PC-01", "user:ktadesse", "ip:10.0.5.21", "ip:45.77.12.9"],
    hints: [
      "Start with the beaconing host — what's its IP and user?",
      "Port scans and file reads share the same asset_id.",
      "Isolating LAB-PC-01 before the upload stops the exfiltration.",
    ],
    build: () => {
      const d: Draft[] = [];
      const base = { user: "ktadesse", src_ip: "10.0.5.21", asset: "LAB-PC-01", malicious: true, scenarioId: "S2" } as const;
      d.push({ ...base, source: "endpoint", type: "process_start", path: "C:\\Users\\ktadesse\\AppData\\Roaming\\update.exe", message: "WINWORD.EXE spawned update.exe (unsigned)", delaySec: 10 });
      d.push({ ...base, source: "network", type: "beacon", dst_ip: "45.77.12.9", port: 443, bytes: 512, message: "update.exe → 45.77.12.9:443 periodic 60s beacon", delaySec: 60 });
      const ports = [21, 22, 80, 135, 139, 389, 443, 445, 1433, 3306, 3389, 5985];
      for (const p of ports) d.push({ ...base, source: "network", type: "conn_attempt", dst_ip: "10.0.5.30", port: p, bytes: 0, message: `SYN 10.0.5.21 → 10.0.5.30:${p}`, delaySec: 3 });
      for (const f of ["\\\\FS-01\\HR\\salaries_2026.xlsx", "\\\\FS-01\\HR\\employee_ssn.csv", "\\\\FS-01\\Finance\\q3_ledger.xlsx", "\\\\FS-01\\Secrets\\svc_passwords.kdbx"]) d.push({ ...base, source: "file", type: "file_access", path: f, message: `Read ${f}`, delaySec: 25 });
      d.push({ ...base, source: "endpoint", type: "archive_create", path: "C:\\ProgramData\\tmp\\hr.7z", bytes: 480_000_000, message: "7z.exe a -p hr.7z (480 MB staged)", delaySec: 60 });
      d.push({ ...base, source: "proxy", type: "upload", dst_ip: "45.77.12.9", port: 443, bytes: 480_000_000, message: "HTTPS POST 480 MB to 45.77.12.9/upload", delaySec: 45 });
      d.push({ ...base, source: "network", type: "beacon", dst_ip: "45.77.12.9", port: 443, bytes: 512, message: "update.exe beacon (post-exfil check-in)", delaySec: 60 });
      return d;
    },
  },
];

const benignUsers = ["hgirma", "aalemu", "tbekele", "mworku", "fhassan"];
const benignPaths = ["\\\\FS-01\\Public\\menu.pdf", "\\\\FS-01\\Projects\\roadmap.docx", "/home/shared/notes.txt"];

export function noiseEvent(): Draft {
  const u = benignUsers[Math.floor(Math.random() * benignUsers.length)];
  const n = Math.floor(Math.random() * 20) + 10;
  const ip = `10.0.2.${n}`;
  const r = Math.random();
  if (r < 0.4) return { source: "auth", type: "login_success", user: u, src_ip: ip, asset: "VPN-GW-01", message: `Accepted password for ${u}`, malicious: false, delaySec: 30 };
  if (r < 0.55) return { source: "auth", type: "login_failed", user: u, src_ip: ip, asset: "VPN-GW-01", message: `Failed password for ${u}`, malicious: false, delaySec: 30 };
  if (r < 0.8) return { source: "file", type: "file_access", user: u, src_ip: ip, asset: `WS-${n}`, path: benignPaths[n % benignPaths.length], message: `Read ${benignPaths[n % benignPaths.length]}`, malicious: false, delaySec: 30 };
  return { source: "proxy", type: "web_request", user: u, src_ip: ip, asset: `WS-${n}`, dst_ip: "142.250.74.14", port: 443, bytes: 20_000 + n * 100, message: "GET https://docs.google.com", malicious: false, delaySec: 30 };
}
