import { VoltEventType, IVoltEvent, EventCallback } from '@types';

export interface IVoltBus {
  subscribe<T = any>(eventType: VoltEventType, callback: EventCallback<T>): () => void;
  publish<T = any>(eventType: VoltEventType, payload?: T): void;
}

export class VoltBus implements IVoltBus {
  private static instance: VoltBus;
  private listeners: Map<VoltEventType, Set<EventCallback>> = new Map();

  private constructor() {}

  public static getInstance(): VoltBus {
    if (!VoltBus.instance) {
      VoltBus.instance = new VoltBus();
    }
    return VoltBus.instance;
  }

  public subscribe<T = any>(eventType: VoltEventType, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
    return () => {
      this.listeners.get(eventType)?.delete(callback);
    };
  }

  public publish<T = any>(eventType: VoltEventType, payload?: T): void {
    const event: IVoltEvent<T> = {
      type: eventType,
      payload,
      timestamp: Date.now()
    };
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(cb => cb(event));
    }
  }
}
