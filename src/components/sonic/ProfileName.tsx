import { nameAppearance } from "@/lib/cosmetics";
import type { Profile } from "./types";

export function ProfileName({ profile, className = "" }: { profile: Profile; className?: string }) {
  return <span className={`break-words [overflow-wrap:anywhere] ${nameAppearance(profile.name_color, profile.name_font)} ${className}`}>{profile.display_name || profile.username}</span>;
}