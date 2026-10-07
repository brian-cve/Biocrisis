import Phaser from 'phaser';
import { audio } from './audio/engine';
import { music } from './audio/music';
import { SCREEN_H, SCREEN_W } from './engine/renderer';
import { settings } from './game/settings';
import { BootScene } from './scenes/BootScene';
import { ControlsScene } from './scenes/ControlsScene';
import { GameOverScene, WinScene } from './scenes/EndScene';
import { GameScene } from './scenes/GameScene';
import { IntroScene } from './scenes/IntroScene';
import { InventoryScene } from './scenes/InventoryScene';
import { OptionsScene } from './scenes/OptionsScene';
import { PauseScene } from './scenes/PauseScene';
import { TitleScene } from './scenes/TitleScene';
import { touchUI } from './ui/touchUI';

const syncAudio = () => audio.setVolumes(settings.value);
syncAudio();
settings.onChange(syncAudio);

const scenes = [BootScene, TitleScene, ControlsScene, OptionsScene, IntroScene, GameScene, PauseScene, InventoryScene, GameOverScene, WinScene];

// Solo en desarrollo: ?scene=Game salta directamente a una escena (para pruebas automáticas).
if (import.meta.env.DEV) {
  const want = new URLSearchParams(location.search).get('scene');
  const i = scenes.findIndex((s) => s.name.replace('Scene', '') === want);
  if (i > 0) scenes.unshift(...scenes.splice(i, 1));
}

const game = new Phaser.Game({
  type: Phaser.CANVAS,
  parent: 'game',
  width: SCREEN_W,
  height: SCREEN_H,
  backgroundColor: '#000000',
  pixelArt: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  input: { gamepad: true },
  scene: scenes,
});

touchUI.init(game);

// El secuenciador de música se alimenta del bucle de Phaser pero programa con el reloj de AudioContext.
game.events.on(Phaser.Core.Events.STEP, () => music.tick());

if (import.meta.env.DEV) {
  const w = window as unknown as { __game: Phaser.Game; __audio: typeof audio; __music: typeof music };
  w.__game = game;
  w.__audio = audio;
  w.__music = music;
}
