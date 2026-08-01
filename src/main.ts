import { AppController } from '@core/AppController';

async function main() {
  try {
    const controller = new AppController();
    await controller.bootstrap('volt-viewport');
  } catch (error) {
    // The loader otherwise masks every startup error as an infinite boot screen.
    console.error('Volt failed to start.', error);

    const loader = document.getElementById('volt-boot-loader');
    if (loader) loader.remove();

    const viewport = document.getElementById('volt-viewport');
    if (viewport) {
      const detail = error instanceof Error ? error.message : String(error);
      viewport.innerHTML = `
        <main role="alert" style="min-height:100vh;box-sizing:border-box;padding:2rem;background:#000;color:#ff6b6b;font:16px/1.5 monospace">
          <h1 style="color:#fff">Volt could not start</h1>
          <p>${escapeHtml(detail)}</p>
          <p style="color:#bbb">Open the browser console for details, then refresh after resolving the problem.</p>
        </main>`;
    }
  }
}

function escapeHtml(value: string): string {
  const element = document.createElement('div');
  element.textContent = value;
  return element.innerHTML;
}

if (typeof document !== 'undefined' && document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void main());
} else {
  void main();
}
