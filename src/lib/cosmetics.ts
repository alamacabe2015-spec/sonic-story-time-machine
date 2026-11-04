import sonic from "@/assets/avatar-sonic.jpg";
import tails from "@/assets/avatar-tails.jpg";
import knuckles from "@/assets/avatar-knuckles.jpg";
import amy from "@/assets/avatar-amy.jpg";
import shadow from "@/assets/avatar-shadow.jpg";
import silver from "@/assets/avatar-silver.jpg";
import metal from "@/assets/avatar-metal.jpg";
import eggman from "@/assets/avatar-eggman.jpg";
import rouge from "@/assets/avatar-rouge.jpg";
import blaze from "@/assets/avatar-blaze.jpg";
import cream from "@/assets/avatar-cream.jpg";
import espio from "@/assets/avatar-espio.jpg";
import hyper from "@/assets/avatar-hyper.jpg";
import super2 from "@/assets/avatar-super2.jpg";
import glitch from "@/assets/avatar-glitch.jpg";
import superSonic from "@/assets/avatar-super.jpg";
import greenHill from "@/assets/background-green-hill.jpg";
import chemicalPlant from "@/assets/background-chemical-plant.jpg";
import angelIsland from "@/assets/background-angel-island.jpg";

export const BACKGROUND_IMAGES: Record<string, string> = { "background-green-hill": greenHill, "background-chemical-plant": chemicalPlant, "background-angel-island": angelIsland };

export const AVATAR_IMAGES: Record<string, string> = { "avatar-sonic": sonic, "avatar-tails": tails, "avatar-knuckles": knuckles, "avatar-amy": amy, "avatar-shadow": shadow, "avatar-silver": silver, "avatar-metal": metal, "avatar-eggman": eggman, "avatar-rouge": rouge, "avatar-blaze": blaze, "avatar-cream": cream, "avatar-espio": espio, "avatar-hyper": hyper, "avatar-super2": super2, "avatar-glitch": glitch, "avatar-super": superSonic };
const colors: Record<string, string> = { "color-blue": "name-blue", "color-red": "name-red", "color-pink": "name-pink", "color-gold": "name-gold", "color-shadow": "name-shadow", "color-rainbow": "name-rainbow", "color-glitch": "name-glitch" };
const fonts: Record<string, string> = { "font-speed": "name-speed", "font-tech": "name-tech", "font-bold": "name-bold", "font-elegant": "name-elegant" };
export const nameAppearance = (color?: string | null, font?: string | null) => `${colors[color ?? ""] ?? ""} ${fonts[font ?? ""] ?? ""}`;