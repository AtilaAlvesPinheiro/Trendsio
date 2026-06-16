/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  [key: string]: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly url: string;
  readonly main: boolean;
  hot?: {
    accept(callback?: (mod: any) => void): void;
    dispose(callback: () => void): void;
    decline(): void;
    invalidate(): void;
    on(event: string, callback: any): void;
    off(event: string, callback: any): void;
    send(event: string, data: any): void;
  };
  glob(pattern: string | string[], options?: any): Record<string, any>;
}

declare module '*.json' {
  const data: Record<string, any>;
  export default data;
}

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}
