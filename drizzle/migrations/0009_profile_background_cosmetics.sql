ALTER TABLE public.profiles ADD COLUMN background_cosmetic text;
ALTER TABLE public.sonic_cosmetics DROP CONSTRAINT sonic_cosmetics_category_check;
ALTER TABLE public.sonic_cosmetics ADD CONSTRAINT sonic_cosmetics_category_check CHECK (category IN ('color','font','avatar','background'));
DO $extend$
DECLARE definition text;
BEGIN
 definition := pg_get_functiondef('public.equip_sonic_cosmetic(text,text)'::regprocedure);
 definition := replace(definition, '(''color'',''font'',''avatar'')', '(''color'',''font'',''avatar'',''background'')');
 definition := replace(definition, 'avatar_cosmetic=CASE WHEN kind=''avatar'' THEN item_id ELSE avatar_cosmetic END', 'avatar_cosmetic=CASE WHEN kind=''avatar'' THEN item_id ELSE avatar_cosmetic END,background_cosmetic=CASE WHEN kind=''background'' THEN item_id ELSE background_cosmetic END');
 EXECUTE definition;
 definition := pg_get_functiondef('public.validate_cosmetics()'::regprocedure);
 definition := replace(definition, 'RETURN NEW;', 'IF NEW.background_cosmetic IS NOT NULL AND NOT EXISTS(SELECT 1 FROM public.owned_cosmetics o JOIN public.sonic_cosmetics c ON c.id=o.cosmetic_id WHERE o.user_id=NEW.id AND c.id=NEW.background_cosmetic AND c.category=''background'') THEN RAISE EXCEPTION ''Fondo no comprado''; END IF; RETURN NEW;');
 EXECUTE definition;
END
$extend$;