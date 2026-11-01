import sonicFace from "@/assets/sonic-face.png";
import type { Profile } from "./types";
import { AVATAR_IMAGES } from "@/lib/cosmetics";

const sizes = { sm: "h-10 w-10", md: "h-12 w-12", xl: "h-28 w-28" };

export function Avatar({ profile, size = "md" }: { profile?: Pick<Profile, "avatar_url" | "username" | "avatar_cosmetic"> | null | undefined; size?: keyof typeof sizes }) {
  return (
    <img src={AVATAR_IMAGES[profile?.avatar_cosmetic ?? ""] || profile?.avatar_url || sonicFace} alt={profile?.username ?? ""} width={256} height={256}
      className={`${sizes[size]} shrink-0 rounded-full border-4 border-ring-gold bg-muted object-cover`} />
  );
}
