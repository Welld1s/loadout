import { runFull } from "@loadout/exec";
import { clamp } from "./rumble";

const SERVICE = "org.shadowblip.InputPlumber";
const IFACE = "org.shadowblip.Input.CompositeDevice";
const BUSCTL_TIMEOUT_MS = 5000;

interface ExecResult {
  ok: boolean;
  stdout: string;
  stderr: string;
  code: number;
}

async function exec(cmd: string[]): Promise<ExecResult> {
  try {
    const { stdout, stderr, exitCode } = await runFull(cmd, {
      timeoutMs: BUSCTL_TIMEOUT_MS,
    });
    return { ok: exitCode === 0, stdout, stderr, code: exitCode };
  } catch (e) {
    return {
      ok: false,
      stdout: "",
      stderr: e instanceof Error ? e.message : String(e),
      code: -1,
    };
  }
}

function busctl(args: string[]): Promise<ExecResult> {
  return exec(["busctl", "--system", "--no-pager", ...args]);
}

function parseStringArrayProp(stdout: string): string[] | null {
  const m = stdout.trim().match(/^as\s+(\d+)((?:\s+"(?:\\.|[^"\\])*")*)$/);
  if (!m) return null;
  const count = parseInt(m[1] ?? "0", 10);
  if (count === 0) return [];
  const out: string[] = [];
  const re = /"((?:\\.|[^"\\])*)"/g;
  let p: RegExpExecArray | null;
  while ((p = re.exec(m[2] ?? "")) !== null) {
    out.push(p[1]?.replace(/\\"/g, '"').replace(/\\\\/g, "\\") ?? "");
  }
  return out;
}

function parseStringProp(stdout: string): string | null {
  const m = stdout.trim().match(/^s\s+"((?:\\.|[^"\\])*)"$/);
  if (!m) return null;
  return m[1]?.replace(/\\"/g, '"').replace(/\\\\/g, "\\") ?? null;
}

export async function listCompositeDevicePaths(): Promise<string[]> {
  const r = await busctl(["tree", "--list", SERVICE]);
  if (!r.ok) return [];
  const lines = r.stdout.split("\n");
  const paths: string[] = [];
  for (const line of lines) {
    const t = line.trim();
    if (/^\/org\/shadowblip\/InputPlumber\/CompositeDevice\d+$/.test(t)) {
      paths.push(t);
    }
  }
  return paths;
}

export async function getPropertyStringArray(path: string, prop: string): Promise<string[] | null> {
  const r = await busctl(["get-property", SERVICE, path, IFACE, prop]);
  if (!r.ok) return null;
  return parseStringArrayProp(r.stdout);
}

export async function getPropertyString(path: string, prop: string): Promise<string | null> {
  const r = await busctl(["get-property", SERVICE, path, IFACE, prop]);
  if (!r.ok) return null;
  return parseStringProp(r.stdout);
}

export async function findRumbleDevice(): Promise<{ path: string; name: string } | null> {
  const paths = await listCompositeDevicePaths();
  for (const path of paths) {
    const caps = await getPropertyStringArray(path, "OutputCapabilities");
    if (caps && caps.includes("Rumble")) {
      const name = await getPropertyString(path, "Name");
      if (name) return { path, name };
    }
  }
  return null;
}

export async function sendRumble(devicePath: string, left: number, right: number): Promise<boolean> {
  left = clamp(left, 0, 1);
  right = clamp(right, 0, 1);
  const args = [
    "call",
    SERVICE,
    devicePath,
    IFACE,
    "send_event",
    "s", "Rumble",
    "v", "ad", "2", String(left), String(right)
  ];
  const r = await busctl(args);
  return r.ok;
}
