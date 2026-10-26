import sonicFace from "@/assets/sonic-face.png";
import type { Profile } from "./types";

const sizes = { sm: "h-10 w-10", md: "h-12 w-12", xl: "h-28 w-28" };

export function Avatar({ profile, size = "md" }: { profile?: Pick<Profile, "avatar_url" | "username"> | null | undefined; size?: keyof typeof sizes }) {
  return (
    <img src={profile?.avatar_url || sonicFace} alt={profile?.username ?? ""}
      className={`${sizes[size]} rounded-full border-4 border-ring-gold bg-muted object-cover`} />
  );
}
