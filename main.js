import { SpaceScene } from './space-immersive.js';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('canvas-container');
  if (container) {
    new SpaceScene(container);
  }
});
