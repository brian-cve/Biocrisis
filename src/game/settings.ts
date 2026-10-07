/** Ajustes persistentes. localStorage puede no existir o fallar (modo privado): todo va en try/catch. */

export interface Settings {
  musicVolume: number; // 0..1
  sfxVolume: number; // 0..1
  muted: boolean;
  /** Multiplicador de la velocidad de giro (0.5–2). */
  sensitivity: number;
  aimAssist: boolean;
  /** Giro con el ratón (Pointer Lock). */
  mouseLook: boolean;
  /** Minimapa opcional (apagado por defecto: resta tensión). */
  minimap: boolean;
  /** Mando táctil Game Boy: auto = solo en dispositivos táctiles. */
  touchControls: 'auto' | 'on' | 'off';
  controlsSeen: boolean;
}

export const DEFAULT_SETTINGS: Readonly<Settings> = {
  musicVolume: 0.7,
  sfxVolume: 0.9,
  muted: false,
  sensitivity: 1,
  aimAssist: true,
  mouseLook: false,
  minimap: false,
  touchControls: 'auto',
  controlsSeen: false,
};

const KEY = 'biocrisis.settings.v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

function defaultStorage(): StorageLike | null {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null;
  } catch {
    return null;
  }
}

const clamp = (v: unknown, lo: number, hi: number, fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;

/** Valida y completa un objeto arbitrario (datos corruptos o de otra versión) con valores por defecto. */
export function sanitize(raw: unknown): Settings {
  const r = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const d = DEFAULT_SETTINGS;
  const bool = (v: unknown, f: boolean) => (typeof v === 'boolean' ? v : f);
  return {
    musicVolume: clamp(r.musicVolume, 0, 1, d.musicVolume),
    sfxVolume: clamp(r.sfxVolume, 0, 1, d.sfxVolume),
    muted: bool(r.muted, d.muted),
    sensitivity: clamp(r.sensitivity, 0.5, 2, d.sensitivity),
    aimAssist: bool(r.aimAssist, d.aimAssist),
    mouseLook: bool(r.mouseLook, d.mouseLook),
    minimap: bool(r.minimap, d.minimap),
    touchControls: r.touchControls === 'on' || r.touchControls === 'off' || r.touchControls === 'auto' ? r.touchControls : d.touchControls,
    controlsSeen: bool(r.controlsSeen, d.controlsSeen),
  };
}

export class SettingsStore {
  value: Settings;
  private listeners = new Set<(s: Settings) => void>();

  constructor(private readonly storage: StorageLike | null = defaultStorage()) {
    this.value = this.load();
  }

  private load(): Settings {
    try {
      const txt = this.storage?.getItem(KEY);
      return sanitize(txt ? JSON.parse(txt) : null);
    } catch {
      return sanitize(null);
    }
  }

  update(patch: Partial<Settings>): void {
    this.value = sanitize({ ...this.value, ...patch });
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.value));
    } catch {
      /* sin almacenamiento: los ajustes valen solo para esta sesión */
    }
    for (const l of this.listeners) l(this.value);
  }

  onChange(fn: (s: Settings) => void): () => void {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }
}

/** Instancia global compartida por todas las escenas. */
export const settings = new SettingsStore();
