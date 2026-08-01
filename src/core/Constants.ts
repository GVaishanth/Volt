export const SYSTEM_CONSTANTS = {
  VERSION: '1.0.0',
  DEFAULT_CWD: 'C:\\Users\\Volt',
  STORAGE_QUOTA_BYTES: 50 * 1024 * 1024, // 50 MB OPFS target
  BOOT_SEQUENCE_STEPS: [
    'Initializing...',
    'Loading Filesystem...',
    'Loading Terminal...',
    'Ready.'
  ] as const,
  SUPPORTED_THEMES: [
    'Pure Black (Volt Default)',
    'Classic CMD',
    'VS Code Dark+',
    'Matrix',
    'Light'
  ] as const
} as const;
