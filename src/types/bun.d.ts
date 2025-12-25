declare const Bun: {
  spawn(command: string[] | string, options?: { stdin?: Uint8Array | null }): Promise<{ stdout: Uint8Array; stderr: Uint8Array; exitCode: number }>;
};
