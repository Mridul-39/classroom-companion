/**
 * Client-side fetch helper with optional fallback when the API is unavailable.
 */
export async function fetchJson<T>(
  url: string,
  fallback?: T
): Promise<{ data: T; fromFallback: boolean }> {
  try {
    const res = await fetch(url);
    const data = (await res.json()) as T & { error?: string };
    if (!res.ok || (data as { error?: string }).error) {
      if (fallback !== undefined) {
        return { data: fallback, fromFallback: true };
      }
      throw new Error((data as { error?: string }).error ?? 'Request failed');
    }
    return { data: data as T, fromFallback: false };
  } catch (error) {
    if (fallback !== undefined) {
      return { data: fallback, fromFallback: true };
    }
    throw error;
  }
}
