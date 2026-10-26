export const toEmail = (username: string) =>
  `${username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "")}@sonicnews.app`;

export const normalizeUsername = (u: string) => u.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");

export const MIN_YEAR = 1991;
export const yearsAvailable = (now = new Date()) => {
  const out: number[] = [];
  for (let y = now.getFullYear(); y >= MIN_YEAR; y--) out.push(y);
  return out;
};

export const SONIC_STICKERS = ["💍", "💎", "🦔", "⚡", "💨", "🌀", "😎", "😁", "👍", "🔥", "🏃‍♂️", "⭐", "🟦", "🟢", "❤️", "🏆"];

/** Resize an image file to a small square JPEG data URL for avatars. */
export async function fileToAvatar(file: File, size = 256): Promise<string> {
  const url = URL.createObjectURL(file);
  const img = await new Promise<HTMLImageElement>((res, rej) => {
    const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url;
  });
  const c = document.createElement("canvas");
  c.width = c.height = size;
  const s = Math.min(img.width, img.height);
  c.getContext("2d")!.drawImage(img, (img.width - s) / 2, (img.height - s) / 2, s, s, 0, 0, size, size);
  URL.revokeObjectURL(url);
  return c.toDataURL("image/jpeg", 0.85);
}
