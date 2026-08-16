import type { PluginBackend, EmitPayload, PluginLogger } from "@loadout/types";
import { readPluginStorage, writePluginStorage } from "@loadout/plugin-storage";
import * as ip from "./lib/ipdbus";
import { getIntensityMultiplier, INTENSITY_LEVELS } from "./lib/rumble";
import type { IntensityLevel, RumbleStatus } from "./shared";

const PLUGIN_ID = "rumble-control";

interface StoredState {
  intensity: IntensityLevel;
  leftEnabled: boolean;
  rightEnabled: boolean;
}

export default class RumbleControlBackend implements PluginBackend {
  emit?: (payload: EmitPayload) => void;
  log?: PluginLogger;

  private state: StoredState = { intensity: 'off', leftEnabled: true, rightEnabled: true };
  private device: { path: string; name: string } | null = null;
  private testTimer: ReturnType<typeof setTimeout> | null = null;

  async onLoad(): Promise<void> {
    this.log?.info("Rumble Control plugin loaded");
    const stored = await readPluginStorage<StoredState>(PLUGIN_ID);
    if (stored) {
      this.state = stored;
    }
    await this.refreshDevice();
    await this.broadcastStatus();
    setInterval(() => this.refreshDeviceAndBroadcast(), 30_000);
  }

  async onUnload(): Promise<void> {
    if (this.testTimer) {
      clearTimeout(this.testTimer);
      this.testTimer = null;
    }
    this.log?.info("Rumble Control plugin unloaded");
  }

  private async refreshDevice(): Promise<void> {
    const dev = await ip.findRumbleDevice();
    this.device = dev;
    if (dev) {
      this.log?.info(`Found rumble device: ${dev.name} at ${dev.path}`);
    } else {
      this.log?.warn("No rumble-capable device found");
    }
  }

  private async refreshDeviceAndBroadcast(): Promise<void> {
    await this.refreshDevice();
    await this.broadcastStatus();
  }

  private async broadcastStatus(): Promise<void> {
    const status: RumbleStatus = {
      available: this.device !== null,
      intensity: this.state.intensity,
      leftEnabled: this.state.leftEnabled,
      rightEnabled: this.state.rightEnabled,
      devicePath: this.device?.path ?? null,
      deviceName: this.device?.name ?? null,
    };
    this.emit?.({ event: "rumble-status", data: status });
  }

  private async applyRumble(): Promise<void> {
    if (!this.device) {
      this.log?.warn("Cannot apply rumble: no device");
      return;
    }
    const multiplier = getIntensityMultiplier(this.state.intensity);
    const left = this.state.leftEnabled ? multiplier : 0;
    const right = this.state.rightEnabled ? multiplier : 0;
    const ok = await ip.sendRumble(this.device.path, left, right);
    if (!ok) {
      this.log?.warn("sendRumble failed");
    }
  }

  // ── RPC methods ─────────────────────────────────────────────

  async getRumbleStatus(): Promise<RumbleStatus> {
    await this.refreshDevice();
    return {
      available: this.device !== null,
      intensity: this.state.intensity,
      leftEnabled: this.state.leftEnabled,
      rightEnabled: this.state.rightEnabled,
      devicePath: this.device?.path ?? null,
      deviceName: this.device?.name ?? null,
    };
  }

  async setIntensity(level: IntensityLevel): Promise<{ ok: boolean; error?: string }> {
    if (!INTENSITY_LEVELS.includes(level)) {
      return { ok: false, error: "Invalid intensity level" };
    }
    this.state.intensity = level;
    await writePluginStorage<StoredState>(PLUGIN_ID, this.state);
    await this.applyRumble();
    await this.broadcastStatus();
    return { ok: true };
  }

  async setMotorEnabled(motor: 'left' | 'right', enabled: boolean): Promise<{ ok: boolean; error?: string }> {
    if (motor === 'left') {
      this.state.leftEnabled = enabled;
    } else if (motor === 'right') {
      this.state.rightEnabled = enabled;
    } else {
      return { ok: false, error: "Invalid motor" };
    }
    await writePluginStorage<StoredState>(PLUGIN_ID, this.state);
    await this.applyRumble();
    await this.broadcastStatus();
    return { ok: true };
  }

  async testVibration(durationMs: number = 500): Promise<{ ok: boolean; error?: string }> {
    if (!this.device) {
      return { ok: false, error: "No rumble device available" };
    }
    if (this.testTimer) {
      clearTimeout(this.testTimer);
      this.testTimer = null;
    }
    const multiplier = getIntensityMultiplier(this.state.intensity);
    if (multiplier === 0) {
      return { ok: true };
    }
    const ok = await ip.sendRumble(this.device.path, multiplier, multiplier);
    if (!ok) {
      return { ok: false, error: "Failed to send rumble" };
    }
    this.testTimer = setTimeout(async () => {
      this.testTimer = null;
      await this.applyRumble();
    }, durationMs);
    return { ok: true };
  }
}
