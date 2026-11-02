import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Lock, X } from "lucide-react";
import { getAchievements, type Achievement } from "@/lib/achievements.functions";

export function LogrosModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const load = useServerFn(getAchievements);
  const [items, setItems] = useState<Achievement[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(false);
    load().then(setItems).catch(() => setError(true));
  }, [open, load]);

  if (!open) return null;
  const done = items.filter((a) => a.unlocked_at).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 bg-sky px-4 py-3 shadow-pop">
        <h2 className="flex-1 text-2xl text-primary-foreground">Logros</h2>
        <span className="font-extrabold text-primary-foreground">{done} de {items.length}</span>
        <button onClick={onClose} aria-label="Cerrar" className="rounded-full bg-primary-foreground/20 p-2 text-primary-foreground"><X className="h-5 w-5" /></button>
      </header>
      <div className="mx-auto max-w-xl space-y-2 p-4 pb-10">
        <progress className="h-2 w-full accent-primary" value={done} max={items.length || 51} />
        {error && <p className="font-bold text-destructive">No se pudieron cargar los logros.</p>}
        {!error && items.length === 0 && <p className="text-muted-foreground">Cargando logros...</p>}
        {items.map((a) => {
          const unlocked = !!a.unlocked_at;
          const mysterious = a.code === "misterioso" && !unlocked;
          return (
            <div key={a.code} className={`flex items-center gap-3 rounded-2xl p-3 ${unlocked ? "border-l-8 border-ring-gold bg-card shadow-sm" : "bg-muted"}`}>
              <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-2xl ${unlocked ? "bg-ring-gold/20" : "bg-background"}`}>
                {unlocked ? a.icon : mysterious ? "❓" : <Lock className="h-5 w-5 text-muted-foreground" />}
              </div>
              <div className="min-w-0">
                <p className={`font-extrabold ${unlocked ? "" : "text-muted-foreground"}`}>{mysterious ? "???" : a.name}</p>
                <p className="text-xs text-muted-foreground">{a.description}</p>
                {unlocked && a.unlocked_at && (
                  <p className="text-[10px] font-bold text-primary">Conseguido el {new Date(a.unlocked_at).toLocaleDateString("es-ES", { day: "numeric", month: "long" })}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
