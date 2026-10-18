export function confirmMutation<T>(
  result: { data: T | null; error: unknown },
  message: string,
): T {
  if (result.error || result.data === null) throw new Error(message);
  return result.data;
}
