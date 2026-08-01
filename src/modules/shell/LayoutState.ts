import { VoltBus } from '@core/VoltBus';

export interface ILayoutState {
  editorOpen: boolean;
  setEditorOpen(open: boolean): void;
  toggleEditor(): void;
}

export class LayoutState implements ILayoutState {
  private static instance: LayoutState;
  private bus = VoltBus.getInstance();
  private unsubscribers: (() => void)[] = [];

  public editorOpen: boolean = false;

  private constructor() {}

  private subscribeToEvents(): void {
    this.unsubscribers.forEach(unsub => unsub());
    this.unsubscribers = [];
    this.editorOpen = false;

    this.unsubscribers.push(
      this.bus.subscribe('LAYOUT:SET_EDITOR', e => {
        const open = (e.payload as any)?.open ?? false;
        this.editorOpen = open;
        this.apply();
      })
    );
  }

  public static getInstance(): LayoutState {
    if (!LayoutState.instance) {
      LayoutState.instance = new LayoutState();
    }
    LayoutState.instance.subscribeToEvents();
    return LayoutState.instance;
  }

  public setEditorOpen(open: boolean): void {
    this.editorOpen = open;
    this.apply();
    this.bus.publish('LAYOUT:EDITOR_CHANGED', { open });
  }

  public toggleEditor(): void {
    this.setEditorOpen(!this.editorOpen);
  }

  private apply(): void {
    const editorZone = document.getElementById('volt-editor-zone');
    const terminalZone = document.getElementById('volt-terminal-zone');

    if (editorZone) {
      if (this.editorOpen) {
        editorZone.classList.remove('hidden');
        editorZone.style.display = 'flex';
        editorZone.classList.add('active');
      } else {
        editorZone.classList.add('hidden');
        editorZone.style.display = 'none';
        editorZone.classList.remove('active');
      }
    }

    if (terminalZone) {
      if (this.editorOpen) {
        terminalZone.classList.add('docked-split');
      } else {
        terminalZone.classList.remove('docked-split');
      }
    }
  }
}
