import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/sonic.functions";
import { fileToAvatar, normalizeUsername, toEmail } from "@/lib/sonic";
import type { Profile } from "./types";
import { Avatar } from "./Avatar";
import { ProfileName } from "./ProfileName";
import { Button } from "@/components/ui/button";
import { useAchievements } from "@/lib/use-achievements";
import { BACKGROUND_IMAGES } from "@/lib/cosmetics";

export function AccountTab({ profile, onChange }: { profile: Profile; onChange: () => void }) {
  const [bio, setBio] = useState(profile.bio);
  const [switching, setSwitching] = useState(false);
  const [u, setU] = useState(""); const [p, setP] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const del = useServerFn(deleteMyAccount);
  const { refresh } = useAchievements();

  async function save(fields: Partial<Profile>) {
    const { error } = await supabase.from("profiles").update(fields).eq("id", profile.id);
    if (error) toast.error("No se pudo guardar"); else { toast.success("¡Guardado!"); onChange(); void refresh(); }
  }

  async function switchAccount(e: React.FormEvent) {
    e.preventDefault();
    const { error } = await supabase.auth.signInWithPassword({ email: toEmail(normalizeUsername(u)), password: p });
    if (error) toast.error("Usuario o contraseña incorrectos"); else toast.success("Has cambiado de cuenta");
  }

  async function remove() {
    if (!confirm("¿Seguro que quieres borrar tu cuenta para siempre?")) return;
    try { await del(); await supabase.auth.signOut(); toast.success("Cuenta borrada"); }
    catch { toast.error("No se pudo borrar la cuenta"); }
  }

  const input = "w-full rounded-xl border-2 border-input bg-card px-4 py-3 font-semibold outline-none focus:border-primary";

  return (
    <div className="space-y-5">
      <h2 className="text-2xl text-primary">Mi cuenta</h2>
      {profile.background_cosmetic && BACKGROUND_IMAGES[profile.background_cosmetic] && <img src={BACKGROUND_IMAGES[profile.background_cosmetic]} alt="Tu fondo de cuenta" width={1536} height={864} className="aspect-video w-full rounded-lg object-cover" />}
      <div className="rounded-2xl bg-card p-5 flex flex-col items-center gap-2">
        <Button variant="ghost" className="h-auto rounded-full p-0" onClick={() => fileRef.current?.click()} aria-label="Cambiar foto"><Avatar profile={profile} size="xl" /></Button>
        <input ref={fileRef} type="file" accept="image/*" hidden
          onChange={async (e) => { const f = e.target.files?.[0]; if (f) save({ avatar_url: await fileToAvatar(f), avatar_cosmetic: null }); }} />
        <p className="text-xl font-extrabold max-w-full text-center"><ProfileName profile={profile} /></p>
        {profile.equipped_title && <p className="text-sm font-extrabold text-primary text-center">✦ {profile.equipped_title}</p>}
        <dl className="w-full text-sm space-y-1 mt-2">
          <div className="flex justify-between"><dt className="text-muted-foreground">Usuario</dt><dd className="font-bold">@{profile.username}</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Contraseña</dt><dd className="font-bold">••••••••</dd></div>
          <div className="flex justify-between"><dt className="text-muted-foreground">Cuenta creada</dt><dd className="font-bold">{new Date(profile.created_at).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })}</dd></div>
        </dl>
      </div>

      <div className="rounded-2xl bg-card p-5 space-y-2">
        <h3 className="text-lg">Sobre mí</h3>
        <textarea className={input} rows={3} maxLength={300} placeholder="Escribe algo sobre ti..." value={bio} onChange={(e) => setBio(e.target.value)} />
        <button onClick={() => save({ bio })} className="rounded-xl bg-primary px-5 py-2 font-extrabold text-primary-foreground">Guardar</button>
      </div>

      <div className="rounded-2xl bg-card p-5 space-y-3">
        <button onClick={() => setSwitching(!switching)} className="w-full rounded-xl bg-secondary py-3 font-extrabold text-secondary-foreground">Cambiar de cuenta</button>
        {switching && (
          <form onSubmit={switchAccount} className="space-y-2">
            <input className={input} placeholder="Usuario" value={u} onChange={(e) => setU(e.target.value)} autoCapitalize="none" />
            <input className={input} type="password" placeholder="Contraseña" value={p} onChange={(e) => setP(e.target.value)} />
            <button className="w-full rounded-xl bg-primary py-3 font-extrabold text-primary-foreground">Entrar</button>
          </form>
        )}
        <button onClick={remove} className="w-full rounded-xl bg-destructive py-3 font-extrabold text-destructive-foreground">Borrar mi cuenta</button>
      </div>
    </div>
  );
}
