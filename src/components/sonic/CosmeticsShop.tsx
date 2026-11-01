import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Coins, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { equipCosmetic, redeemCosmetic } from "@/lib/games.functions";
import { AVATAR_IMAGES } from "@/lib/cosmetics";
import { ProfileName } from "./ProfileName";
import type { Profile } from "./types";

type Kind = "color" | "font" | "avatar";
const field = { color: "name_color", font: "name_font", avatar: "avatar_cosmetic" } as const;
export function CosmeticsShop({ kind, coins, profile, onChange }: { kind: Kind; coins: number; profile: Profile; onChange: () => void }) {
  const [items, setItems] = useState<Tables<"sonic_cosmetics">[]>([]);
  const [owned, setOwned] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const redeem = useServerFn(redeemCosmetic);
  const equip = useServerFn(equipCosmetic);
  async function load() {
    const [catalog, inventory] = await Promise.all([supabase.from("sonic_cosmetics").select("*").order("price"), supabase.from("owned_cosmetics").select("cosmetic_id").eq("user_id", profile.id)]);
    if (catalog.error || inventory.error) { setError(true); return; }
    setItems(catalog.data ?? []); setOwned((inventory.data ?? []).map((x) => x.cosmetic_id)); setLoaded(true); setError(false);
  }
  useEffect(() => { void load(); }, [profile.id]);
  async function select(item: Tables<"sonic_cosmetics">) {
    if (busy) return;
    const mine = owned.includes(item.id);
    if (!mine && !confirm(`¿Canjear ${item.price} monedas por «${item.name}»?`)) return;
    setBusy(true);
    try {
      if (mine) await equip({ data: { id: item.id, kind } }); else await redeem({ data: { id: item.id } });
      await load(); onChange(); toast.success("¡Premio equipado!");
    } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo guardar"); }
    finally { setBusy(false); }
  }
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-2 border-b-2 border-border pb-3"><ProfileName profile={profile} className="font-extrabold text-xl" />{profile[field[kind]] && <Button variant="outline" size="sm" disabled={busy} onClick={async () => { setBusy(true); try { await equip({ data: { id: null, kind } }); onChange(); } catch { toast.error("No se pudo quitar"); } finally { setBusy(false); } }}>Quitar</Button>}</div>
    {error ? <Button onClick={load}>Reintentar</Button> : !loaded ? <p>Cargando premios…</p> : <div className="grid grid-cols-2 gap-3">{items.filter((x) => x.category === kind).map((item) => {
      const mine = owned.includes(item.id); const active = profile[field[kind]] === item.id;
      const preview = { ...profile, [field[kind]]: item.id };
      return <article key={item.id} className={`flex flex-col gap-3 rounded-lg border-2 bg-card p-3 min-w-0 ${item.rarity === "Legendario" ? "border-ring-gold" : "border-border"}`}>
        {kind === "avatar" ? <img src={AVATAR_IMAGES[item.id]} alt={item.name} width={256} height={256} loading="lazy" className="aspect-square w-full rounded-lg object-cover" /> : <div className="flex min-h-20 items-center justify-center text-center"><ProfileName profile={preview} className="text-lg font-extrabold" /></div>}
        <span className="text-xs font-bold text-muted-foreground">{item.rarity}</span><h3 className="text-sm flex-1 break-words">{item.name}</h3>
        <Button variant={mine ? "outline" : "secondary"} className="h-auto min-h-10 w-full whitespace-normal text-xs px-2" disabled={busy || active || (!mine && coins < item.price)} onClick={() => select(item)}>{active ? <><Check />Equipado</> : mine ? <><Sparkles />Equipar</> : <><Coins />{item.price}</>}</Button>
        {!mine && coins < item.price && <p className="text-xs text-muted-foreground">Faltan {item.price - coins} monedas</p>}
      </article>;
    })}</div>}
  </div>;
}