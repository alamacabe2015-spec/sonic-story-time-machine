import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useState } from "react";
import { Clock, Coins, Gamepad2, Newspaper, ShoppingBag, Trophy, User, Users } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { AuthScreen } from "@/components/sonic/AuthScreen";
import { NewsTab } from "@/components/sonic/NewsTab";
import { AccountTab } from "@/components/sonic/AccountTab";
import { TimeMachineTab } from "@/components/sonic/TimeMachineTab";
import { FriendsTab } from "@/components/sonic/FriendsTab";
import type { Friendship, Profile } from "@/components/sonic/types";
import sonicFace from "@/assets/sonic-face.png";
import { Button } from "@/components/ui/button";
import { GamesTab } from "@/components/sonic/GamesTab";
import { ShopTab } from "@/components/sonic/ShopTab";
import { LogrosModal } from "@/components/sonic/LogrosModal";
import { useAchievements } from "@/lib/use-achievements";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sonic News — Bienvenido, fan de Sonic" },
      { name: "description", content: "Noticias de Sonic, máquina del tiempo, chat, test de personajes y tienda de títulos con monedas." },
      { property: "og:title", content: "Sonic News" },
      { property: "og:description", content: "Noticias, amigos, juegos de Sonic y títulos para tu perfil." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

type Tab = "news" | "account" | "time" | "friends" | "games" | "shop";

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
  const [coins, setCoins] = useState(0);
  const [logros, setLogros] = useState(false);
  const { refresh: refreshAchievements } = useAchievements();

  useEffect(() => { void refreshAchievements(); }, [refreshAchievements]);

  const loadCoins = useCallback(() => {
    supabase.from("game_wallets").select("coins").eq("user_id", userId).maybeSingle().then(({ data }) => setCoins(data?.coins ?? 0));
  }, [userId]);

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
    loadMe(); loadFriends(); loadCoins();
    const ch = supabase.channel(`fr-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "friendships" }, () => loadFriends()).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [loadMe, loadFriends, loadCoins]);

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
    { id: "games", label: "Juegos", icon: Gamepad2 },
    { id: "shop", label: "Tienda", icon: ShoppingBag },
  ];

  return (
    <div className="min-h-screen pb-24">
      <header className="sticky top-0 z-30 bg-sky shadow-pop flex items-center gap-3 px-4 py-3">
        <div className="relative">
          <img src={sonicFace} alt="Sonic News" className="h-10 w-10" />
          {pending > 0 && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-accent ring-2 ring-primary-foreground" />}
        </div>
        <h1 className="text-2xl text-primary-foreground">SONIC NEWS</h1>
        <span className="ml-auto flex items-center gap-1 font-extrabold text-primary-foreground" aria-label={`${coins} monedas`}><Coins className="h-5 w-5 text-ring-gold" />{coins}</span>
        <button onClick={() => setLogros(true)} aria-label="Logros" className="flex flex-col items-center gap-0.5 text-primary-foreground">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-foreground/20"><Trophy className="h-5 w-5 text-ring-gold" /></span>
          <span className="text-[10px] font-extrabold leading-none">Logros</span>
        </button>
      </header>
      <main className="mx-auto max-w-xl p-4">
        {tab === "news" && <NewsTab userId={userId} />}
        {tab === "account" && <AccountTab profile={me} onChange={loadMe} />}
        {tab === "time" && <TimeMachineTab />}
        {tab === "friends" && <FriendsTab me={me} friendships={friendships} people={people} reload={loadFriends} />}
        {tab === "games" && <GamesTab coins={coins} onReward={loadCoins} onShop={() => setTab("shop")} />}
         {tab === "shop" && <ShopTab coins={coins} equipped={me.equipped_title ?? null} userId={userId} profile={me} onChange={() => { loadCoins(); loadMe(); loadFriends(); }} />}
      </main>
      <LogrosModal open={logros} onClose={() => setLogros(false)} />
      <nav className="fixed bottom-0 inset-x-0 z-30 bg-card border-t-4 border-primary grid grid-cols-6 pb-[env(safe-area-inset-bottom)]">
        {tabs.map((t) => (
          <Button variant="ghost" key={t.id} onClick={() => setTab(t.id)} aria-label={t.label} aria-current={tab === t.id ? "page" : undefined}
            className={`relative h-20 min-w-0 rounded-none flex flex-col items-center justify-start gap-1 px-1 py-2 text-[10px] leading-tight whitespace-normal font-extrabold ${tab === t.id ? "text-primary" : "text-muted-foreground"}`}>
            <t.icon className="h-6 w-6" />
            {t.label}
            {t.dot && <span className="absolute top-1 right-1/4 h-3 w-3 rounded-full bg-accent" />}
          </Button>
        ))}
      </nav>
    </div>
  );
}
