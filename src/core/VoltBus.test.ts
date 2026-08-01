import { describe, it, expect, vi } from 'vitest';
import { VoltBus } from './VoltBus';

describe('VoltBus Event Broker', () => {
  it('should publish and subscribe to typed events cleanly', () => {
    const bus = VoltBus.getInstance();
    const callback = vi.fn();

    const unsubscribe = bus.subscribe('APP:BOOT_START', callback);
    bus.publish('APP:BOOT_START', { step: 'Initializing...' });

    expect(callback).toHaveBeenCalledTimes(1);
    expect(callback).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'APP:BOOT_START',
        payload: { step: 'Initializing...' }
      })
    );

    unsubscribe();
    bus.publish('APP:BOOT_START');
    expect(callback).toHaveBeenCalledTimes(1);
  });
});
