// Normalizes heterogeneous raw log lines into a common schema.
export interface Normalized {
  timestamp?: string | undefined;
  source: string;
  event_type: string;
  username?: string | undefined;
  source_ip?: string | undefined;
  dest_ip?: string | undefined;
  dest_port?: number | undefined;
  asset_id?: string | undefined;
  path?: string | undefined;
  bytes?: number | undefined;
  parser: string;
}

export function normalizeLine(line: string): Normalized | { error: string } {
  const l = line.trim();
  if (!l) return { error: "empty line" };
  if (l.startsWith("{")) {
    try {
      const j = JSON.parse(l);
      return { timestamp: j["@timestamp"] ?? j.timestamp, source: j.source ?? "json", event_type: j.event ?? j.event_type ?? "unknown", username: j.user ?? j.username, asset_id: j.host, path: j.path, parser: "json" };
    } catch {
      return { error: "invalid JSON" };
    }
  }
  let m = l.match(/^(\S+)\s+(\S+)\s+sshd\[\d+\]:\s+(Failed|Accepted) password for (?:invalid user )?(\S+) from (\S+) port (\d+)/);
  if (m) return { timestamp: m[1], asset_id: m[2], source: "auth", event_type: m[3] === "Failed" ? "login_failed" : "login_success", username: m[4], source_ip: m[5], dest_port: Number(m[6]), parser: "sshd" };
  m = l.match(/^(\S+)\s+\S+\s+CONN src=(\S+) dst=(\S+) dport=(\d+).*?bytes=(\d+)(?: host=(\S+))?/);
  if (m) return { timestamp: m[1], source: "network", event_type: "connection", source_ip: m[2], dest_ip: m[3], dest_port: Number(m[4]), bytes: Number(m[5]), asset_id: m[6], parser: "firewall" };
  m = l.match(/^(\S+)\s+proxy\S*\s+(\S+)\s+(\S+)\s+(GET|POST|PUT)\s+https?:\/\/([^/\s]+)\S*\s+bytes_out=(\d+)/);
  if (m) return { timestamp: m[1], source: "proxy", event_type: m[4] === "GET" ? "web_request" : "upload", source_ip: m[2], username: m[3] === "-" ? undefined : m[3], dest_ip: m[5], bytes: Number(m[6]), parser: "proxy" };
  m = l.match(/^(\d{1,3}(?:\.\d{1,3}){3}) \S+ (\S+) \[([^\]]+)\] "(\w+) (\S+)[^"]*" (\d{3}) (\d+)/);
  if (m) return { timestamp: m[3], source: "web", event_type: `http_${m[6]}`, source_ip: m[1], username: m[2] === "-" ? undefined : m[2], path: m[5], bytes: Number(m[7]), parser: "apache_clf" };
  return { error: "no parser matched" };
}
