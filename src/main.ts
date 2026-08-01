import { AppController } from '@core/AppController';

async function main() {
  const controller = new AppController();
  await controller.bootstrap('volt-viewport');
}

if (typeof document !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void main());
} else {
  void main();
}
