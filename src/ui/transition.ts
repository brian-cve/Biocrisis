import Phaser from 'phaser';

export function fadeTo(scene: Phaser.Scene, key: string, data?: object, ms = 280): void {
  const cam = scene.cameras.main;
  if (cam.fadeEffect.isRunning && cam.fadeEffect.direction) return;
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => scene.scene.start(key, data));
  cam.fadeOut(ms, 0, 0, 0);
}

export function fadeIn(scene: Phaser.Scene, ms = 350): void {
  scene.cameras.main.fadeIn(ms, 0, 0, 0);
}
