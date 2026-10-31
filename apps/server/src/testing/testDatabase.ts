export function localTestDatabaseUrl() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url)
    throw new Error(
      "Set TEST_DATABASE_URL to a disposable local PostgreSQL database",
    );
  const parsed = new URL(url);
  if (
    !["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname) ||
    !parsed.pathname.startsWith("/webgame_test_")
  ) {
    throw new Error("Tests require a local database named webgame_test_*");
  }
  return url;
}
