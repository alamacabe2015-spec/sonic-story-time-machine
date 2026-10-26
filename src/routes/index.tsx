import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Clock, Newspaper, User, Users } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthScreen } from "@/components/sonic/AuthScreen";
import { NewsTab } from "@/components/sonic/NewsTab";
import { AccountTab } from "@/components/sonic/AccountTab";
import { TimeMachineTab } from "@/components/sonic/TimeMachineTab";
import { FriendsTab } from "@/components/sonic/FriendsTab";
import type { Friendship, Profile } from "@/components/sonic/types";
import sonicFace from "@/assets/sonic-face.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sonic News — Bienvenido, fan de Sonic" },
      { name: "description", content: "Noticias de Sonic al momento, máquina del tiempo desde 1991 y chat con tus amigos." },
      { property: "og:title", content: "Sonic News" },
      { property: "og:description", content: "Noticias de Sonic, máquina del tiempo y chat con amigos." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Tab = "news" | "account" | "time" | "friends";

function Index() {
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s));
    return () => data.subscription.unsubscribe();
  }, []);

  if (session === undefined)
    return <div className="min-h-screen bg-sky flex items-center justify-center"><img src={sonicFace} alt="" className="w-24 animate-spin" /></div>;
  if (!session) return <AuthScreen />;
  return <MainApp key={session.user.id} userId={session.user.id} />;
}

function MainApp({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>("news");
  const [me, setMe] = useState<Profile | null>(null);
  const [friendships, setFriendships] = useState<Friendship[]>([]);
  const [people, setPeople] = useState<Record<string, Profile>>({});

  const loadMe = useCallback(() => {
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle().then(({ data }) => setMe(data));
  }, [userId]);

  const loadFriends = useCallback(async () => {
    const { data } = await supabase.from("friendships").select("*");
    const list = data ?? [];
    setFriendships(list);
    const ids = [...new Set(list.flatMap((f) => [f.requester, f.addressee]))];
    if (ids.length) {
      const { data: ps } = await supabase.from("profiles").select("*").in("id", ids);
      setPeople(Object.fromEntries((ps ?? []).map((p) => [p.id, p])));
    }
  }, []);

  useEffect(() => {
    loadMe(); loadFriends();
    const ch = supabase.channel(`fr-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => loadFriends()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadMe, loadFriends]);

  const pending = friendships.filter((f) => f.status === "pending" && f.addressee === userId).length;

  useEffect(() => {
    document.title = pending ? `(${pending}) Sonic News` : "Sonic News";
  }, [pending]);

  if (!me) return <div className="min-h-screen bg-sky flex items-center justify-center"><img src={sonicFace} alt="" className="w-24 animate-spin" /></div>;

  const tabs: { id: Tab; label: string; icon: typeof Newspaper; dot?: boolean }[] = [
    { id: "news", label: "Noticias", icon: Newspaper },
    { id: "account", label: "Mi cuenta", icon: User },
    { id: "time", label: "Máquina del tiempo", icon: Clock },
    { id: "friends", label: "Amigos y chat", icon: Users, dot: pending > 0 },
  ];

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 bg-sky shadow-pop flex items-center gap-3 px-4 py-3">
        <div className="relative">
          <img src={sonicFace} alt="Sonic News" className="h-10 w-10" />
          {pending > 0 && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent ring-2 ring-primary-foreground" />}
        </div>
        <h1 className="text-2xl text-primary-foreground">SONIC NEWS</h1>
      </header>
      <main className="mx-auto max-w-xl p-4">
        {tab === "news" && <NewsTab />}
        {tab === "account" && <AccountTab profile={me} onChange={loadMe} />}
        {tab === "time" && <TimeMachineTab />}
        {tab === "friends" && <FriendsTab me={me} friendships={friendships} people={people} reload={loadFriends} />}
      </main>
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-card border-t-4 border-primary grid grid-cols-4">
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`relative flex flex-col items-center gap-1 py-2 text-[11px] font-extrabold ${tab === t.id ? "text-primary" : "text-muted-foreground"}`}>
            <t.icon className="h-6 w-6" />
            {t.label}
            {t.dot && <span className="absolute top-1 right-1/4 h-3 w-3 rounded-full bg-accent" />}
          </button>
        ))}
      </nav>
    </div>
  );
}
