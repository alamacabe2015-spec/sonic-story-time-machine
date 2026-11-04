DO $repair$
DECLARE
  definition text := pg_get_functiondef('public.check_achievements()'::regprocedure);
BEGIN
  definition := regexp_replace(definition, 'earned := earned \|\| ''([^'']+)''', 'earned := array_append(earned, ''\1'')', 'g');
  definition := replace(definition, 'new_codes := new_codes || ''misterioso''', 'new_codes := array_append(new_codes, ''misterioso'')');
  IF definition LIKE '%earned := earned ||%' OR definition LIKE '%new_codes := new_codes ||%' THEN
    RAISE EXCEPTION 'Achievement array repair incomplete';
  END IF;
  EXECUTE definition;
END
$repair$;