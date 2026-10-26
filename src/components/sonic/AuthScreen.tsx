import { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { fileToAvatar, normalizeUsername, toEmail } from "@/lib/sonic";
import sonicFace from "@/assets/sonic-face.png";

export function AuthScreen({ initialMode = "signup" }: { initialMode?: "signup" | "login" }) {
  const [mode, setMode] = useState(initialMode);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [avatar, setAvatar] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const u = normalizeUsername(username);
    if (u.length < 3) { toast.error("El usuario debe tener al menos 3 letras (sin espacios)"); return; }
    if (password.length < 6) { toast.error("La contraseña debe tener al menos 6 caracteres"); return; }
    setBusy(true);
    if (mode === "signup") {
      const { data: taken } = await supabase.from("profiles").select("id").eq("username", u).maybeSingle();
      if (taken) { setBusy(false); { toast.error("Ese usuario ya existe"); return; } }
      const { data, error } = await supabase.auth.signUp({
        email: toEmail(u), password,
        options: { data: { username: u, display_name: name.trim() } },
      });
      if (error) toast.error(error.message.includes("registered") ? "Ese usuario ya existe" : "No se pudo crear la cuenta");
      else if (avatar && data.user) await supabase.from("profiles").update({ avatar_url: avatar }).eq("id", data.user.id);
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email: toEmail(u), password });
      if (error) toast.error("Usuario o contraseña incorrectos");
    }
    setBusy(false);
  }

  const input = "w-full rounded-xl border-2 border-input bg-card px-4 py-3 text-base font-semibold outline-none focus:border-primary";

  return (
    <div className="min-h-screen bg-sky flex flex-col items-center justify-center px-5 py-10">
      <img src={sonicFace} alt="Sonic" width={816} height={816} className="w-28 h-28 drop-shadow-xl animate-bounce" />
      <h1 className="mt-2 text-4xl text-primary-foreground tracking-wide">SONIC NEWS</h1>
      <p className="mt-1 text-xl font-extrabold text-secondary">¡Bienvenido, fan de Sonic!</p>

      <form onSubmit={submit} className="mt-6 w-full max-w-sm rounded-2xl bg-card p-6 shadow-pop space-y-4">
        <h2 className="text-center text-2xl text-primary">{mode === "signup" ? "Crear una cuenta" : "Entrar a mi cuenta"}</h2>

        {mode === "signup" && (
          <div className="flex justify-center">
            <button type="button" onClick={() => fileRef.current?.click()}
              className="relative h-24 w-24 rounded-full border-4 border-ring-gold bg-muted overflow-hidden flex items-center justify-center"
              aria-label="Elegir foto de perfil">
              {avatar ? <img src={avatar} alt="Tu foto" className="h-full w-full object-cover" /> : <Camera className="h-8 w-8 text-muted-foreground" />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" hidden
              onChange={async (e) => { const f = e.target.files?.[0]; if (f) setAvatar(await fileToAvatar(f)); }} />
          </div>
        )}

        <input className={input} placeholder="Usuario" value={username} onChange={(e) => setUsername(e.target.value)} autoCapitalize="none" />
        {mode === "signup" && <input className={input} placeholder="Tu nombre" value={name} onChange={(e) => setName(e.target.value)} />}
        <input className={input} type="password" placeholder="Contraseña" value={password} onChange={(e) => setPassword(e.target.value)} />

        <button disabled={busy} className="w-full rounded-xl bg-primary py-3 text-lg font-extrabold text-primary-foreground shadow-pop active:translate-y-1 disabled:opacity-60">
          {busy ? "..." : "Entrar"}
        </button>

        <button type="button" onClick={() => setMode(mode === "signup" ? "login" : "signup")}
          className="w-full text-center font-bold text-primary underline">
          {mode === "signup" ? "Ya tengo una cuenta" : "Crear una cuenta nueva"}
        </button>
      </form>
    </div>
  );
}
