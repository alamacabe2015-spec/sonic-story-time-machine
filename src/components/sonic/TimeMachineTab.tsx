import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getYearNews, type YearItem } from "@/lib/sonic.functions";
import { yearsAvailable } from "@/lib/sonic";
import { useAchievements } from "@/lib/use-achievements";

export function TimeMachineTab() {
  const fetchYear = useServerFn(getYearNews);
  const [year, setYear] = useState<number | null>(null);
  const [items, setItems] = useState<YearItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const { record } = useAchievements();

  async function travel(y: number) {
    setYear(y); setLoading(true); setErr(""); setItems([]);
    try { setItems(await fetchYear({ data: { year: y } })); void record("year_visited", { year: y }); }
    catch (e) { setErr(e instanceof Error ? e.message : "Error"); }
    setLoading(false);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl text-primary">Máquina del tiempo ⏳</h2>
      <p className="text-sm text-muted-foreground">Elige un año y viaja a las noticias de Sonic de esa época.</p>
      <div className="grid grid-cols-4 gap-2">
        {yearsAvailable().map((y) => (
          <button key={y} onClick={() => travel(y)}
            className={`rounded-xl py-2 font-extrabold ${year === y ? "bg-primary text-primary-foreground shadow-pop" : "bg-card text-primary"}`}>
            {y}
          </button>
        ))}
      </div>
      {year && (
        <div className="space-y-3">
          <h3 className="text-xl">Noticias de {year}</h3>
          {loading && <p className="animate-pulse font-bold text-primary">💨 Viajando en el tiempo...</p>}
          {err && <p className="text-destructive font-bold">{err}</p>}
          {items.map((it, i) => (
            <article key={i} className="rounded-2xl bg-card p-4 border-l-8 border-emerald">
              <h4 className="font-extrabold">{it.title}</h4>
              <p className="text-sm mt-1">{it.summary}</p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
