ALTER TABLE public.quiz_questions ADD COLUMN difficulty text NOT NULL DEFAULT 'easy';
ALTER TABLE public.quiz_sessions ADD COLUMN mode text NOT NULL DEFAULT 'easy', ADD COLUMN reward integer NOT NULL DEFAULT 10;
CREATE TABLE public.sonic_cosmetics(id text PRIMARY KEY, name text NOT NULL, category text NOT NULL CHECK(category IN ('color','font','avatar')), price integer NOT NULL CHECK(price>0), rarity text NOT NULL DEFAULT 'Especial');
GRANT SELECT ON public.sonic_cosmetics TO authenticated; GRANT ALL ON public.sonic_cosmetics TO service_role;
ALTER TABLE public.sonic_cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY cosmetics_read ON public.sonic_cosmetics FOR SELECT TO authenticated USING(true);
CREATE TABLE public.owned_cosmetics(user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE, cosmetic_id text NOT NULL REFERENCES public.sonic_cosmetics(id), PRIMARY KEY(user_id,cosmetic_id));
GRANT SELECT ON public.owned_cosmetics TO authenticated; GRANT ALL ON public.owned_cosmetics TO service_role;
ALTER TABLE public.owned_cosmetics ENABLE ROW LEVEL SECURITY;
CREATE POLICY cosmetics_owned_read ON public.owned_cosmetics FOR SELECT TO authenticated USING(user_id=auth.uid());
ALTER TABLE public.profiles ADD COLUMN name_color text, ADD COLUMN name_font text, ADD COLUMN avatar_cosmetic text;
CREATE FUNCTION public.validate_cosmetics() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ BEGIN
IF NEW.name_color IS NOT NULL AND NOT EXISTS(SELECT 1 FROM owned_cosmetics o JOIN sonic_cosmetics c ON c.id=o.cosmetic_id WHERE o.user_id=NEW.id AND c.id=NEW.name_color AND c.category='color') THEN RAISE EXCEPTION 'Color no comprado'; END IF;
IF NEW.name_font IS NOT NULL AND NOT EXISTS(SELECT 1 FROM owned_cosmetics o JOIN sonic_cosmetics c ON c.id=o.cosmetic_id WHERE o.user_id=NEW.id AND c.id=NEW.name_font AND c.category='font') THEN RAISE EXCEPTION 'Letra no comprada'; END IF;
IF NEW.avatar_cosmetic IS NOT NULL AND NOT EXISTS(SELECT 1 FROM owned_cosmetics o JOIN sonic_cosmetics c ON c.id=o.cosmetic_id WHERE o.user_id=NEW.id AND c.id=NEW.avatar_cosmetic AND c.category='avatar') THEN RAISE EXCEPTION 'Avatar no comprado'; END IF;
RETURN NEW; END $$;
CREATE TRIGGER validate_cosmetics BEFORE INSERT OR UPDATE OF name_color,name_font,avatar_cosmetic ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_cosmetics();
CREATE FUNCTION public.equip_sonic_cosmetic(item_id text, kind text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE uid uuid:=auth.uid(); BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Inicia sesión'; END IF;
IF kind NOT IN ('color','font','avatar') OR kind IS NULL THEN RAISE EXCEPTION 'Categoría no válida'; END IF;
IF item_id IS NOT NULL AND NOT EXISTS(SELECT 1 FROM owned_cosmetics o JOIN sonic_cosmetics c ON c.id=o.cosmetic_id WHERE o.user_id=uid AND c.id=item_id AND c.category=kind) THEN RAISE EXCEPTION 'Premio no comprado'; END IF;
UPDATE profiles SET name_color=CASE WHEN kind='color' THEN item_id ELSE name_color END,name_font=CASE WHEN kind='font' THEN item_id ELSE name_font END,avatar_cosmetic=CASE WHEN kind='avatar' THEN item_id ELSE avatar_cosmetic END WHERE id=uid;
END $$;
REVOKE ALL ON FUNCTION public.equip_sonic_cosmetic(text,text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.equip_sonic_cosmetic(text,text) TO authenticated;
CREATE FUNCTION public.redeem_sonic_cosmetic(item_id text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE c sonic_cosmetics; uid uuid:=auth.uid(); balance integer; BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Inicia sesión'; END IF;
SELECT * INTO c FROM sonic_cosmetics WHERE id=item_id; IF NOT FOUND THEN RAISE EXCEPTION 'Premio no válido'; END IF;
INSERT INTO game_wallets(user_id) VALUES(uid) ON CONFLICT DO NOTHING;
SELECT coins INTO balance FROM game_wallets WHERE user_id=uid FOR UPDATE;
IF EXISTS(SELECT 1 FROM owned_cosmetics WHERE user_id=uid AND cosmetic_id=item_id) THEN RAISE EXCEPTION 'Ya tienes este premio'; END IF;
IF balance<c.price THEN RAISE EXCEPTION 'Necesitas más monedas'; END IF;
UPDATE game_wallets SET coins=coins-c.price WHERE user_id=uid RETURNING coins INTO balance;
INSERT INTO owned_cosmetics VALUES(uid,item_id);
PERFORM equip_sonic_cosmetic(item_id,c.category); RETURN balance; END $$;
REVOKE ALL ON FUNCTION public.redeem_sonic_cosmetic(text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.redeem_sonic_cosmetic(text) TO authenticated;
CREATE FUNCTION public.start_sonic_quiz_mode(selected_mode text) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE uid uuid:=auth.uid(); s quiz_sessions; q quiz_questions; ids text[]; count_q integer; pay integer; BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Inicia sesión'; END IF;
CASE selected_mode WHEN 'easy' THEN count_q:=8;pay:=10; WHEN 'normal' THEN count_q:=10;pay:=15; WHEN 'hard' THEN count_q:=10;pay:=25; WHEN 'chaos' THEN count_q:=12;pay:=40; ELSE RAISE EXCEPTION 'Dificultad no válida'; END CASE;
SELECT array_agg(id) INTO ids FROM (SELECT id FROM quiz_questions WHERE difficulty=selected_mode ORDER BY random() LIMIT count_q) x;
IF coalesce(array_length(ids,1),0)<count_q THEN RAISE EXCEPTION 'No hay preguntas disponibles'; END IF;
INSERT INTO quiz_sessions(user_id,question_ids,mode,reward) VALUES(uid,ids,selected_mode,pay) RETURNING * INTO s;
SELECT * INTO q FROM quiz_questions WHERE id=ids[1];
RETURN jsonb_build_object('sessionId',s.id,'position',0,'total',count_q,'correct',0,'reward',pay,'mode',selected_mode,'question',jsonb_build_object('prompt',q.prompt,'options',q.options,'imageKey',q.image_key)); END $$;
REVOKE ALL ON FUNCTION public.start_sonic_quiz_mode(text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.start_sonic_quiz_mode(text) TO authenticated;
CREATE OR REPLACE FUNCTION public.answer_sonic_quiz(session_id uuid, expected_position integer, choice integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE s quiz_sessions; q quiz_questions; n quiz_questions; won boolean; balance integer; BEGIN
SELECT * INTO s FROM quiz_sessions WHERE id=session_id AND user_id=auth.uid() FOR UPDATE;
IF NOT FOUND OR expected_position IS NULL OR choice IS NULL OR s.position<>expected_position OR s.position>=array_length(s.question_ids,1) OR choice NOT BETWEEN 0 AND 3 THEN RAISE EXCEPTION 'Respuesta no válida o ya enviada'; END IF;
SELECT * INTO q FROM quiz_questions WHERE id=s.question_ids[s.position+1]; won:=choice=q.answer;
UPDATE quiz_sessions SET position=position+1,correct=correct+CASE WHEN won THEN 1 ELSE 0 END WHERE id=s.id RETURNING * INTO s;
INSERT INTO game_wallets(user_id,coins) VALUES(s.user_id,CASE WHEN won THEN s.reward ELSE 0 END) ON CONFLICT(user_id) DO UPDATE SET coins=game_wallets.coins+excluded.coins RETURNING coins INTO balance;
SELECT * INTO n FROM quiz_questions WHERE id=s.question_ids[s.position+1];
RETURN jsonb_build_object('sessionId',s.id,'position',s.position,'total',array_length(s.question_ids,1),'correct',s.correct,'mode',s.mode,'reward',s.reward,'coins',balance,'earned',CASE WHEN won THEN s.reward ELSE 0 END,'wasCorrect',won,'correctAnswer',q.options->>q.answer,'explanation',q.explanation,'question',CASE WHEN n.id IS NULL THEN NULL ELSE jsonb_build_object('prompt',n.prompt,'options',n.options,'imageKey',n.image_key) END); END $$;