DO $repair$
DECLARE definition text := pg_get_functiondef('public.check_achievements()'::regprocedure);
BEGIN
  definition := replace(definition,
    'select * into s from public.user_stats where user_id = uid;',
    'update public.user_stats set coins_earned = greatest(coins_earned,
      coalesce((select sum(q.correct * q.reward) from public.quiz_sessions q where q.user_id = uid), 0),
      coalesce((select w.coins from public.game_wallets w where w.user_id = uid), 0))
     where user_id = uid;
     select * into s from public.user_stats where user_id = uid;');
  EXECUTE definition;
END
$repair$;