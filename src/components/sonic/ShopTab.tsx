import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, Coins, ShoppingBag, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";
import { equipTitle, redeemTitle } from "@/lib/games.functions";
import { canRedeemTitle } from "@/lib/games";

export function ShopTab({ coins, equipped, userId, onChange }: { coins: number; equipped: string | null; userId: string; onChange: () => void }) {
  const [titles, setTitles] = useState<Tables<"sonic_titles">[]>([]);
  const [owned, setOwned] = useState<string[]>([]);
  const [filter, setFilter] = useState("Todos");
  const [busy, setBusy] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const redeem = useServerFn(redeemTitle);
  const equip = useServerFn(equipTitle);
  async function load() {
    const [catalog, inventory] = await Promise.all([supabase.from("sonic_titles").select("*").order("price"), supabase.from("owned_titles").select("title_id").eq("user_id", userId)]);
    if (catalog.error || inventory.error) { setError(true); return; }
    setTitles(catalog.data ?? []); setOwned((inventory.data ?? []).map((o) => o.title_id)); setLoaded(true); setError(false);
  }
  useEffect(() => { void load(); }, [userId]);
  async function select(t: Tables<"sonic_titles">) {
    if (busy) return;
    const alreadyOwned = owned.includes(t.id);
    if (!alreadyOwned && !confirm(`¿Canjear ${t.price} monedas por «${t.name}»?`)) return;
    setBusy(t.id);
    try {
      if (alreadyOwned) await equip({ data: { id: t.id } }); else await redeem({ data: { id: t.id } });
      await load(); onChange(); toast.success(alreadyOwned ? "¡Título equipado!" : "¡Título comprado y equipado!");
    } catch (e) { toast.error(e instanceof Error ? e.message : "No se pudo canjear"); }
    finally { setBusy(null); }
  }
  const visible = titles.filter((t) => filter === "Todos" || (filter === "Mis títulos" ? owned.includes(t.id) : t.character === filter));
  return <section className="space-y-4">
    <div className="flex justify-between items-center"><h2 className="text-2xl text-primary">Tienda</h2><span className="flex gap-2 font-extrabold"><Coins className="text-ring-gold" />{coins}</span></div>
    <p className="text-sm text-muted-foreground">Títulos inspirados en los personajes de Sonic; no son citas oficiales.</p>
    {equipped && <div className="border-b-2 border-ring-gold py-3"><p className="text-xs font-bold text-muted-foreground">Tu título</p><p className="font-extrabold text-primary flex items-center gap-2"><Sparkles className="h-4 w-4" />{equipped}</p><Button variant="link" className="px-0" disabled={!!busy} onClick={async () => { setBusy("remove"); try { await equip({ data: { id: null } }); onChange(); } catch { toast.error("No se pudo quitar"); } finally { setBusy(null); } }}>Quitar título</Button></div>}
    <select aria-label="Filtrar títulos" className="w-full rounded-lg border-2 border-input bg-card p-3 font-bold" value={filter} onChange={(e) => setFilter(e.target.value)}>{["Todos", "Mis títulos", "Sonic", "Tails", "Knuckles", "Amy", "Shadow", "Eggman", "Super Sonic", "Hyper Sonic"].map((f) => <option key={f}>{f}</option>)}</select>
    {error ? <Button variant="outline" onClick={load}>Reintentar</Button> : !loaded ? <p>Cargando tienda…</p> : visible.length === 0 ? <p className="text-muted-foreground">Aún no tienes títulos.</p> : <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{visible.map((t) => {
      const mine = owned.includes(t.id); const active = equipped === t.name;
      return <article key={t.id} className={`rounded-lg border-2 p-4 bg-card flex flex-col gap-3 ${t.rarity === "Legendario" ? "border-ring-gold" : "border-border"}`}>
        <div className="flex items-center justify-between text-xs font-extrabold"><span className="text-primary">{t.character}</span><span className={t.rarity === "Legendario" ? "text-accent" : "text-muted-foreground"}>{t.rarity}</span></div>
        <p className="font-extrabold flex-1">{t.name}</p>
        <Button variant={mine ? "outline" : "secondary"} className="w-full whitespace-normal" disabled={!!busy || active || (!mine && !canRedeemTitle(coins, t.price, mine))} onClick={() => select(t)}>{busy === t.id ? "Guardando…" : active ? <><Check />Equipado</> : mine ? <><Sparkles />Equipar</> : <><ShoppingBag />{t.price} monedas</>}</Button>
        {!mine && coins < t.price && <p className="text-xs text-muted-foreground">Te faltan {t.price - coins} monedas</p>}
      </article>;
    })}</div>}
  </section>;
}