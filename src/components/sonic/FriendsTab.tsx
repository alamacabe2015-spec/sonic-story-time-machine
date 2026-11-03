import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { SONIC_STICKERS, normalizeUsername } from "@/lib/sonic";
import { Avatar } from "./Avatar";
import type { Friendship, Message, Profile } from "./types";
import { ProfileName } from "./ProfileName";
import { useAchievements } from "@/lib/use-achievements";

type Props = { me: Profile; friendships: Friendship[]; people: Record<string, Profile>; reload: () => void };

export function FriendsTab({ me, friendships, people, reload }: Props) {
  const [adding, setAdding] = useState(false);
  const [chatWith, setChatWith] = useState<Profile | null>(null);
  const other = (f: Friendship) => people[f.requester === me.id ? f.addressee : f.requester];
  const friends = friendships.filter((f) => f.status === "accepted");
  const incoming = friendships.filter((f) => f.status === "pending" && f.addressee === me.id);
  const { refresh } = useAchievements();

  if (chatWith) return <Chat me={me} friend={chatWith} onBack={() => setChatWith(null)} />;

  async function accept(f: Friendship) {
    await supabase.from("friendships").update({ status: "accepted" }).eq("id", f.id); reload(); void refresh();
  }
  async function reject(f: Friendship) {
    await supabase.from("friendships").delete().eq("id", f.id); reload();
  }

  return (
    <div className="space-y-4 pb-4">
      <h2 className="text-2xl text-primary">Amigos</h2>
      {friends.length === 0 && <p className="text-muted-foreground">Aún no tienes amigos. ¡Añade uno!</p>}
      <ul className="space-y-2">
        {friends.map((f) => { const p = other(f); if (!p) return null; return (
          <li key={f.id}>
            <button onClick={() => setChatWith(p)} className="w-full flex items-center gap-3 rounded-2xl bg-card p-3 text-left">
              <Avatar profile={p} /><div className="min-w-0"><p className="font-extrabold"><ProfileName profile={p} /></p>{p.equipped_title && <p className="text-xs font-extrabold text-primary">✦ {p.equipped_title}</p>}<p className="text-xs text-muted-foreground">@{p.username} · Toca para chatear</p></div>
            </button>
          </li>); })}
      </ul>

      <button onClick={() => setAdding(!adding)} className="flex items-center gap-2 rounded-xl bg-secondary px-4 py-2 font-extrabold text-secondary-foreground">
        <UserPlus className="h-5 w-5" /> Añadir amigos
      </button>
      {adding && <AddFriend me={me} friendships={friendships} reload={reload} />}

      {incoming.length > 0 && (
        <div className="space-y-2 pt-4">
          <h3 className="text-lg">Solicitudes</h3>
          {incoming.map((f) => { const p = people[f.requester]; return (
            <div key={f.id} className="rounded-2xl bg-card p-3 border-2 border-accent flex items-center gap-3">
              <Avatar profile={p} size="sm" />
              <p className="flex-1 text-sm font-bold">Tienes una solicitud de {p?.display_name || p?.username || "alguien"}</p>
              <button onClick={() => accept(f)} className="rounded-lg bg-emerald px-3 py-1 font-extrabold text-primary-foreground">Aceptar</button>
              <button onClick={() => reject(f)} className="rounded-lg bg-muted px-3 py-1 font-bold">✕</button>
            </div>); })}
        </div>
      )}
    </div>
  );
}

function AddFriend({ me, friendships, reload }: { me: Profile; friendships: Friendship[]; reload: () => void }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  useEffect(() => {
    const term = normalizeUsername(q) || q.trim();
    if (term.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("*")
        .or(`username.ilike.%${term}%,display_name.ilike.%${term}%`).neq("id", me.id).limit(10);
      setResults(data ?? []);
    }, 300);
    return () => clearTimeout(t);
  }, [q, me.id]);

  const status = (id: string) => friendships.find((f) => f.requester === id || f.addressee === id)?.status;
  const { refresh } = useAchievements();
  async function send(p: Profile) {
    const { error } = await supabase.from("friendships").insert({ requester: me.id, addressee: p.id });
    if (error) toast.error("No se pudo enviar"); else { toast.success(`Solicitud enviada a ${p.username}`); reload(); void refresh(); }
  }
  return (
    <div className="rounded-2xl bg-card p-4 space-y-2">
      <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca su nombre o usuario..."
        className="w-full rounded-xl border-2 border-input px-4 py-2 font-semibold outline-none focus:border-primary" />
      {results.map((p) => { const s = status(p.id); return (
        <div key={p.id} className="flex items-center gap-3">
          <Avatar profile={p} size="sm" /><p className="flex-1 min-w-0 font-bold"><ProfileName profile={p} /> <span className="text-xs text-muted-foreground">@{p.username}</span></p>
          {s ? <span className="text-xs font-bold text-muted-foreground">{s === "accepted" ? "Amigos" : "Pendiente"}</span>
             : <button onClick={() => send(p)} className="rounded-lg bg-primary px-3 py-1 text-sm font-extrabold text-primary-foreground">Enviar</button>}
        </div>); })}
    </div>
  );
}

function Chat({ me, friend, onBack }: { me: Profile; friend: Profile; onBack: () => void }) {
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [stickers, setStickers] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const { record } = useAchievements();

  useEffect(() => {
    supabase.from("messages").select("*")
      .or(`and(sender.eq.${me.id},receiver.eq.${friend.id}),and(sender.eq.${friend.id},receiver.eq.${me.id})`)
      .order("created_at").then(({ data }) => setMsgs(data ?? []));
    const ch = supabase.channel(`chat-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, (pl) => {
        const m = pl.new as Message;
        if ((m.sender === friend.id && m.receiver === me.id) || (m.sender === me.id && m.receiver === friend.id))
          setMsgs((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [me.id, friend.id]);
  useEffect(() => { bottom.current?.scrollIntoView({ behavior: "smooth" }); }, [msgs]);

  async function send(content: string) {
    if (!content.trim()) return;
    setText("");
    const { data, error } = await supabase.from("messages").insert({ sender: me.id, receiver: friend.id, content }).select().single();
    if (error) toast.error("No se pudo enviar");
    else {
      setMsgs((prev) => prev.some((x) => x.id === data.id) ? prev : [...prev, data]);
      void record("messages_sent");
      if (SONIC_STICKERS.includes(content)) void record("stickers_sent");
    }
  }
  const onlyEmoji = (s: string) => SONIC_STICKERS.includes(s);

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-chat-bg">
      <header className="flex items-center gap-3 bg-primary p-3 text-primary-foreground">
        <button onClick={onBack} aria-label="Volver"><ArrowLeft /></button>
        <Avatar profile={friend} size="sm" />
        <div className="min-w-0"><p className="font-extrabold"><ProfileName profile={friend} /></p>{friend.equipped_title && <p className="text-xs break-words">✦ {friend.equipped_title}</p>}</div>
      </header>
      <div className="flex-1 overflow-y-auto zigzag p-3 space-y-2">
        {msgs.map((m) => { const mine = m.sender === me.id; return (
          <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[75%] rounded-2xl px-3 py-2 shadow-sm ${onlyEmoji(m.content) ? "text-5xl bg-transparent shadow-none" : mine ? "bg-bubble-me rounded-br-sm" : "bg-bubble-them rounded-bl-sm"}`}>
              <p className="whitespace-pre-wrap break-words">{m.content}</p>
              {!onlyEmoji(m.content) && <p className="text-[10px] text-muted-foreground text-right">{new Date(m.created_at).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" })}</p>}
            </div>
          </div>); })}
        <div ref={bottom} />
      </div>
      {stickers && (
        <div className="grid grid-cols-8 gap-1 bg-card p-2">
          {SONIC_STICKERS.map((s) => <button key={s} onClick={() => send(s)} className="text-3xl hover:scale-125 transition">{s}</button>)}
        </div>
      )}
      <form onSubmit={(e) => { e.preventDefault(); send(text); }} className="flex items-center gap-2 bg-card p-2">
        <button type="button" onClick={() => setStickers(!stickers)} className="text-2xl" aria-label="Dibujitos">💍</button>
        <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Escribe un mensaje"
          className="flex-1 rounded-full border-2 border-input px-4 py-2 outline-none focus:border-primary" />
        <button className="rounded-full bg-emerald p-3 text-primary-foreground" aria-label="Enviar"><Send className="h-5 w-5" /></button>
      </form>
    </div>
  );
}
