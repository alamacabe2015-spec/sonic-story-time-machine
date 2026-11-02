alter table public.user_stats
  add column easy_played int not null default 0,
  add column normal_played int not null default 0,
  add column hard_played int not null default 0,
  add column chaos_played int not null default 0;

create or replace function public.record_stat(p_stat text, p_amount int default 1, p_year int default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.user_stats (user_id) values (uid) on conflict (user_id) do nothing;
  if p_stat = 'quizzes_played' then update public.user_stats set quizzes_played = quizzes_played + p_amount where user_id = uid;
  elsif p_stat = 'perfect_rounds' then update public.user_stats set perfect_rounds = perfect_rounds + p_amount where user_id = uid;
  elsif p_stat = 'correct_answers' then update public.user_stats set correct_answers = correct_answers + p_amount where user_id = uid;
  elsif p_stat = 'coins_earned' then update public.user_stats set coins_earned = coins_earned + p_amount where user_id = uid;
  elsif p_stat = 'messages_sent' then update public.user_stats set messages_sent = messages_sent + p_amount where user_id = uid;
  elsif p_stat = 'stickers_sent' then update public.user_stats set stickers_sent = stickers_sent + p_amount where user_id = uid;
  elsif p_stat = 'news_read' then update public.user_stats set news_read = news_read + p_amount where user_id = uid;
  elsif p_stat = 'purchases' then update public.user_stats set purchases = purchases + p_amount where user_id = uid;
  elsif p_stat = 'easy_played' then update public.user_stats set easy_played = easy_played + p_amount where user_id = uid;
  elsif p_stat = 'normal_played' then update public.user_stats set normal_played = normal_played + p_amount where user_id = uid;
  elsif p_stat = 'hard_played' then update public.user_stats set hard_played = hard_played + p_amount where user_id = uid;
  elsif p_stat = 'chaos_played' then update public.user_stats set chaos_played = chaos_played + p_amount where user_id = uid;
  elsif p_stat = 'year_visited' and p_year is not null and p_year between 1991 and 2100 then
    update public.user_stats set years_visited = case when p_year = any (years_visited) then years_visited else years_visited || p_year end where user_id = uid;
  end if;
  update public.user_stats set updated_at = now() where user_id = uid;
end $$;

create or replace function public.check_achievements()
returns text[] language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  s public.user_stats%rowtype;
  p public.profiles%rowtype;
  friends_count int; requests_sent int; titles_count int; legendary_count int; super_count int;
  colors_owned int; fonts_owned int; avatars_owned int; account_days int; years_count int;
  earned text[] := '{}'; new_codes text[] := '{}'; total int;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  insert into public.user_stats (user_id) values (uid) on conflict (user_id) do nothing;
  select * into s from public.user_stats where user_id = uid;
  select * into p from public.profiles where id = uid;
  select count(*) into friends_count from public.friendships where status = 'accepted' and (requester = uid or addressee = uid);
  select count(*) into requests_sent from public.friendships where requester = uid;
  select count(*) into titles_count from public.owned_titles where user_id = uid;
  select count(*) into legendary_count from public.owned_titles ot join public.sonic_titles t on t.id = ot.title_id where ot.user_id = uid and t.rarity = 'Legendario';
  select count(*) into super_count from public.owned_titles ot join public.sonic_titles t on t.id = ot.title_id where ot.user_id = uid and t.character in ('Super Sonic', 'Hyper Sonic');
  select count(*) into colors_owned from public.owned_cosmetics oc join public.sonic_cosmetics c on c.id = oc.cosmetic_id where oc.user_id = uid and c.category = 'color';
  select count(*) into fonts_owned from public.owned_cosmetics oc join public.sonic_cosmetics c on c.id = oc.cosmetic_id where oc.user_id = uid and c.category = 'font';
  select count(*) into avatars_owned from public.owned_cosmetics oc join public.sonic_cosmetics c on c.id = oc.cosmetic_id where oc.user_id = uid and c.category = 'avatar';
  account_days := coalesce(floor(extract(epoch from (now() - p.created_at)) / 86400), 0);
  years_count := coalesce(array_length(s.years_visited, 1), 0);

  if s.quizzes_played >= 1 then earned := earned || 'test-1'; end if;
  if s.quizzes_played >= 10 then earned := earned || 'test-10'; end if;
  if s.quizzes_played >= 25 then earned := earned || 'test-25'; end if;
  if s.perfect_rounds >= 1 then earned := earned || 'perfecto-1'; end if;
  if s.easy_played >= 1 then earned := earned || 'facil-1'; end if;
  if s.normal_played >= 1 then earned := earned || 'normal-1'; end if;
  if s.hard_played >= 1 then earned := earned || 'dificil-1'; end if;
  if s.chaos_played >= 1 then earned := earned || 'caos-1'; end if;
  if s.correct_answers >= 50 then earned := earned || 'aciertos-50'; end if;
  if s.correct_answers >= 200 then earned := earned || 'aciertos-200'; end if;
  if s.coins_earned >= 100 then earned := earned || 'monedas-100'; end if;
  if s.coins_earned >= 500 then earned := earned || 'monedas-500'; end if;
  if s.coins_earned >= 1000 then earned := earned || 'monedas-1000'; end if;
  if s.coins_earned >= 5000 then earned := earned || 'monedas-5000'; end if;
  if s.purchases >= 1 then earned := earned || 'compra-1'; end if;
  if s.purchases >= 10 then earned := earned || 'compras-10'; end if;
  if titles_count >= 1 then earned := earned || 'titulo-1'; end if;
  if titles_count >= 5 then earned := earned || 'titulos-5'; end if;
  if titles_count >= 10 then earned := earned || 'titulos-10'; end if;
  if titles_count >= 20 then earned := earned || 'titulos-20'; end if;
  if legendary_count >= 1 then earned := earned || 'legendario'; end if;
  if p.equipped_title is not null then earned := earned || 'equipa-titulo'; end if;
  if super_count >= 1 then earned := earned || 'super-sonic'; end if;
  if colors_owned >= 1 then earned := earned || 'color-1'; end if;
  if p.name_color is not null then earned := earned || 'color-equipado'; end if;
  if fonts_owned >= 1 then earned := earned || 'fuente-1'; end if;
  if p.name_font is not null then earned := earned || 'fuente-equipada'; end if;
  if avatars_owned >= 1 then earned := earned || 'avatar-1'; end if;
  if p.avatar_cosmetic is not null then earned := earned || 'avatar-personaje'; end if;
  if requests_sent >= 1 then earned := earned || 'solicitud-1'; end if;
  if friends_count >= 1 then earned := earned || 'amigo-1'; end if;
  if friends_count >= 5 then earned := earned || 'amigos-5'; end if;
  if friends_count >= 10 then earned := earned || 'amigos-10'; end if;
  if s.messages_sent >= 1 then earned := earned || 'mensaje-1'; end if;
  if s.messages_sent >= 50 then earned := earned || 'mensajes-50'; end if;
  if s.messages_sent >= 200 then earned := earned || 'mensajes-200'; end if;
  if s.stickers_sent >= 1 then earned := earned || 'sticker-1'; end if;
  if years_count >= 1 then earned := earned || 'viaje-1'; end if;
  if 1991 = any (s.years_visited) then earned := earned || 'anio-1991'; end if;
  if extract(year from now())::int = any (s.years_visited) then earned := earned || 'anio-actual'; end if;
  if years_count >= 5 then earned := earned || 'anios-5'; end if;
  if years_count >= 10 then earned := earned || 'anios-10'; end if;
  if years_count >= 20 then earned := earned || 'anios-20'; end if;
  if years_count >= 30 then earned := earned || 'anios-30'; end if;
  if p.bio is not null and btrim(p.bio) <> '' then earned := earned || 'bio-1'; end if;
  if p.avatar_url is not null then earned := earned || 'foto-1'; end if;
  if account_days >= 7 then earned := earned || 'veterano-7'; end if;
  if account_days >= 30 then earned := earned || 'veterano-30'; end if;
  if s.news_read >= 1 then earned := earned || 'noticia-1'; end if;
  if s.news_read >= 10 then earned := earned || 'noticias-10'; end if;

  with ins as (
    insert into public.user_achievements (user_id, code)
    select uid, c from unnest(earned) as c
    on conflict do nothing
    returning code
  )
  select coalesce(array_agg(code), '{}') into new_codes from ins;

  select count(*) into total from public.user_achievements where user_id = uid;
  if total >= 50 and not exists (select 1 from public.user_achievements where user_id = uid and code = 'misterioso') then
    insert into public.user_achievements (user_id, code) values (uid, 'misterioso');
    new_codes := new_codes || 'misterioso';
  end if;

  return new_codes;
end $$;