import { useCallback, useEffect, useState } from "react";
import {
  FaGamepad,
  FaCheck,
  FaPowerOff,
  FaCircleExclamation,
} from "react-icons/fa6";
import {
  mountComponent,
  mountHeaderStub,
  Spinner,
  useBackend,
  useFocusable,
} from "@loadout/ui";
import type { IntensityLevel, RumbleStatus } from "./shared";

const INTENSITY_BUTTONS: { label: string; value: IntensityLevel }[] = [
  { label: "OFF", value: "off" },
  { label: "LOW", value: "low" },
  { label: "MED", value: "med" },
  { label: "HIGH", value: "high" },
];

function FocusButton({
  onClick,
  disabled,
  children,
  variant = "default",
  selected = false,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
  variant?: "default" | "primary" | "ghost";
  selected?: boolean;
}) {
  const { ref, focused } = useFocusable({ onEnterPress: onClick });
  const base =
    "btn btn-sm " +
    (variant === "primary" ? "btn-primary" : variant === "ghost" ? "btn-ghost" : "");
  const selectedClass = selected ? "ring-2 ring-primary/60" : "";
  return (
    <button
      ref={ref}
      onClick={onClick}
      disabled={disabled}
      className={`${base} ${focused ? "ring-2 ring-primary/40" : ""} ${selectedClass}`}
    >
      {children}
    </button>
  );
}

function RumblePanel() {
  const { call, useEvent } = useBackend("rumble-control");
  const [status, setStatus] = useState<RumbleStatus | null>(null);
  const [testing, setTesting] = useState(false);

  const refresh = useCallback(async () => {
    const s = (await call("getRumbleStatus")) as RumbleStatus;
    setStatus(s);
  }, [call]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEvent({
    event: "rumble-status",
    handler: (data) => setStatus(data as RumbleStatus),
  });

  const setIntensity = useCallback(
    async (level: IntensityLevel) => {
      await call("setIntensity", level);
      await refresh();
    },
    [call, refresh]
  );

  const setMotor = useCallback(
    async (motor: "left" | "right", enabled: boolean) => {
      await call("setMotorEnabled", motor, enabled);
      await refresh();
    },
    [call, refresh]
  );

  const testVibration = useCallback(async () => {
    if (testing) return;
    setTesting(true);
    await call("testVibration", 500);
    setTimeout(() => setTesting(false), 600);
  }, [call, testing]);

  if (!status) {
    return (
      <div className="p-7 h-full overflow-y-auto">
        <div className="page-content">
          <div className="card">
            <div className="card-body p-4.5">
              <div className="flex items-center justify-center h-16">
                <Spinner size={20} />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const intensityLabel = INTENSITY_BUTTONS.find(b => b.value === status.intensity)?.label ?? "OFF";

  return (
    <div className="p-7 h-full overflow-y-auto">
      <div className="page-content">
        <div className="card">
          <div className="card-body p-4.5">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FaGamepad className="w-5 h-5 text-base-content/60" />
                <div className="subsection-label mb-0">Rumble Control</div>
              </div>
              <div className="chip chip-accent">
                {status.available ? (
                  <FaCheck className="w-3 h-3 mr-1 inline" />
                ) : (
                  <FaCircleExclamation className="w-3 h-3 mr-1 inline" />
                )}
                {status.available ? "Connected" : "No device"}
              </div>
            </div>

            {/* Driver info */}
            {status.deviceName && (
              <div className="subsection-desc mono text-[11px] mb-3 text-base-content/40">
                Driver: {status.deviceName} ({status.devicePath})
              </div>
            )}

            {/* Intensity */}
            <div className="subsection">
              <div className="subsection-label">VIBRATION INTENSITY</div>
              <div className="flex gap-2 mt-2 flex-wrap">
                {INTENSITY_BUTTONS.map(({ label, value }) => (
                  <FocusButton
                    key={value}
                    onClick={() => setIntensity(value)}
                    selected={status.intensity === value}
                    variant={status.intensity === value ? "primary" : "default"}
                  >
                    {label}
                  </FocusButton>
                ))}
              </div>
              <div className="subsection-desc mt-2 text-sm">
                Level: <span className="font-semibold">{intensityLabel}</span>
              </div>
            </div>

            {/* Motors toggle */}
            <div className="subsection mt-4">
              <div className="subsection-label">CONTROLLERS</div>
              <div className="flex flex-col gap-2 mt-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Left controller rumble</span>
                  <FocusButton
                    onClick={() => setMotor("left", !status.leftEnabled)}
                    variant={status.leftEnabled ? "primary" : "ghost"}
                  >
                    {status.leftEnabled ? "ON" : "OFF"}
                  </FocusButton>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm">Right controller rumble</span>
                  <FocusButton
                    onClick={() => setMotor("right", !status.rightEnabled)}
                    variant={status.rightEnabled ? "primary" : "ghost"}
                  >
                    {status.rightEnabled ? "ON" : "OFF"}
                  </FocusButton>
                </div>
              </div>
            </div>

            {/* Test button */}
            <div className="subsection mt-4">
              <FocusButton
                onClick={testVibration}
                disabled={!status.available || testing || status.intensity === "off"}
                variant="primary"
              >
                {testing ? <><Spinner size={14} /> Testing…</> : "Test Vibration (0.5s)"}
              </FocusButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export const mount = mountComponent(RumblePanel);
export const mountHeader = mountHeaderStub;
