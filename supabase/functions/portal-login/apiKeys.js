export function resolveSupabaseApiKey(
  jsonKeys,
  singularKey = "",
  legacyKey = "",
) {
  const serializedKeys =
    typeof jsonKeys === "string" ? jsonKeys.trim() : "";

  if (serializedKeys) {
    try {
      const parsedKeys = JSON.parse(serializedKeys);
      if (
        parsedKeys &&
        typeof parsedKeys === "object" &&
        !Array.isArray(parsedKeys)
      ) {
        const candidates = [
          parsedKeys.default,
          ...Object.values(parsedKeys),
        ];
        const resolvedKey = candidates.find(
          (value) => typeof value === "string" && value.trim(),
        );
        if (resolvedKey) {
          return resolvedKey.trim();
        }
      }
    } catch (error) {
      console.error("Supabase API key JSON 設定無法解析：", error);
    }
  }

  return [singularKey, legacyKey].find(
    (value) => typeof value === "string" && value.trim(),
  )?.trim() ?? "";
}
