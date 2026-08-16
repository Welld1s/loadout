import { describe, it, expect, mock, beforeEach } from "bun:test";
import RumbleControlBackend from "./backend";
import * as ip from "./lib/ipdbus";
import * as storage from "@loadout/plugin-storage";

mock.module("./lib/ipdbus", () => ({
  findRumbleDevice: mock(async () => ({ path: "/test/path", name: "Test Device" })),
  sendRumble: mock(async () => true),
}));

mock.module("@loadout/plugin-storage", () => ({
  readPluginStorage: mock(async () => ({ intensity: 'med', leftEnabled: true, rightEnabled: false })),
  writePluginStorage: mock(async () => {}),
}));

describe("RumbleControlBackend", () => {
  let backend: RumbleControlBackend;

  beforeEach(() => {
    backend = new RumbleControlBackend();
    backend.emit = mock(() => {});
    backend.log = { info: mock(), warn: mock() } as any;
  });

  it("should load state from storage", async () => {
    await backend.onLoad();
    expect(backend["state"].intensity).toBe("med");
    expect(backend["state"].leftEnabled).toBe(true);
    expect(backend["state"].rightEnabled).toBe(false);
  });

  it("should set intensity and apply", async () => {
    await backend.setIntensity("high");
    expect(backend["state"].intensity).toBe("high");
    expect(ip.sendRumble).toHaveBeenCalled();
  });

  it("should set motor enabled", async () => {
    await backend.setMotorEnabled("left", false);
    expect(backend["state"].leftEnabled).toBe(false);
    expect(ip.sendRumble).toHaveBeenCalled();
  });

  it("should test vibration", async () => {
    await backend.testVibration(100);
    expect(ip.sendRumble).toHaveBeenCalledWith(expect.anything(), 1, 1);
    await new Promise(resolve => setTimeout(resolve, 150));
    expect(ip.sendRumble).toHaveBeenCalledTimes(2);
  });
});
