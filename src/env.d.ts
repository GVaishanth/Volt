/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_VOLT_VERSION: string;
  readonly VITE_STORAGE_QUOTA_MB: string;
  readonly VITE_DEBUG_BUS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
