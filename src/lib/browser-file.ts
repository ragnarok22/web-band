export async function readTextFile(
  file: File,
  maximumBytes: number,
  tooLargeMessage: string,
): Promise<string> {
  if (file.size > maximumBytes) throw new Error(tooLargeMessage);
  return file.text();
}

export function downloadTextFile(
  content: string,
  fileName: string,
  mimeType: string,
): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.download = fileName;
  anchor.href = url;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
