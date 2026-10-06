export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { readEnvironment } = await import("@/server/env");
    readEnvironment();
  }
}
