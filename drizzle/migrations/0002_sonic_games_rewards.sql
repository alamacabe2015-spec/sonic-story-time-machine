CREATE TABLE public.sonic_titles (id text PRIMARY KEY, name text NOT NULL, character text NOT NULL, price integer NOT NULL CHECK (price > 0), rarity text NOT NULL);
GRANT SELECT ON public.sonic_titles TO authenticated; GRANT ALL ON public.sonic_titles TO service_role;
ALTER TABLE public.sonic_titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY titles_read ON public.sonic_titles FOR SELECT TO authenticated USING (true);
CREATE TABLE public.game_wallets (user_id uuid PRIMARY KEY, coins integer NOT NULL DEFAULT 0 CHECK (coins >= 0));
GRANT SELECT ON public.game_wallets TO authenticated; GRANT ALL ON public.game_wallets TO service_role;
ALTER TABLE public.game_wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY wallet_read ON public.game_wallets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TABLE public.owned_titles (user_id uuid NOT NULL, title_id text NOT NULL REFERENCES public.sonic_titles(id), PRIMARY KEY(user_id,title_id));
GRANT SELECT ON public.owned_titles TO authenticated; GRANT ALL ON public.owned_titles TO service_role;
ALTER TABLE public.owned_titles ENABLE ROW LEVEL SECURITY;
CREATE POLICY inventory_read ON public.owned_titles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE TABLE public.quiz_questions (id text PRIMARY KEY, prompt text NOT NULL, options jsonb NOT NULL, answer integer NOT NULL CHECK(answer BETWEEN 0 AND 3), image_key text, explanation text NOT NULL);
GRANT ALL ON public.quiz_questions TO service_role;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
CREATE TABLE public.quiz_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL, question_ids text[] NOT NULL, position integer NOT NULL DEFAULT 0, correct integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.quiz_sessions TO service_role;
ALTER TABLE public.quiz_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ADD COLUMN equipped_title text;
CREATE FUNCTION public.validate_equipped_title() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ BEGIN
IF NEW.equipped_title IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.owned_titles o JOIN public.sonic_titles t ON t.id=o.title_id WHERE o.user_id=NEW.id AND t.name=NEW.equipped_title) THEN RAISE EXCEPTION 'Título no comprado'; END IF; RETURN NEW; END $$;
CREATE TRIGGER validate_equipped_title BEFORE INSERT OR UPDATE OF equipped_title ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.validate_equipped_title();
CREATE FUNCTION public.start_sonic_quiz() RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ DECLARE uid uuid:=auth.uid(); s public.quiz_sessions; q public.quiz_questions; ids text[]; BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Inicia sesión'; END IF;
SELECT array_agg(id) INTO ids FROM (SELECT id FROM public.quiz_questions ORDER BY random() LIMIT 5) x;
IF coalesce(array_length(ids,1),0)<5 THEN RAISE EXCEPTION 'No hay preguntas disponibles'; END IF;
INSERT INTO public.quiz_sessions(user_id,question_ids) VALUES(uid,ids) RETURNING * INTO s;
SELECT * INTO q FROM public.quiz_questions WHERE id=ids[1];
RETURN jsonb_build_object('sessionId',s.id,'position',0,'total',5,'correct',0,'question',jsonb_build_object('prompt',q.prompt,'options',q.options,'imageKey',q.image_key)); END $$;
REVOKE ALL ON FUNCTION public.start_sonic_quiz() FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.start_sonic_quiz() TO authenticated;
CREATE FUNCTION public.answer_sonic_quiz(session_id uuid, expected_position integer, choice integer) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$ DECLARE s public.quiz_sessions; q public.quiz_questions; n public.quiz_questions; won boolean; balance integer; BEGIN
SELECT * INTO s FROM public.quiz_sessions WHERE id=session_id AND user_id=auth.uid() FOR UPDATE;
IF NOT FOUND OR s.position<>expected_position OR s.position>=array_length(s.question_ids,1) OR choice NOT BETWEEN 0 AND 3 THEN RAISE EXCEPTION 'Respuesta no válida o ya enviada'; END IF;
SELECT * INTO q FROM public.quiz_questions WHERE id=s.question_ids[s.position+1]; won:=choice=q.answer;
UPDATE public.quiz_sessions SET position=position+1,correct=correct+CASE WHEN won THEN 1 ELSE 0 END WHERE id=s.id RETURNING * INTO s;
INSERT INTO public.game_wallets(user_id,coins) VALUES(s.user_id,CASE WHEN won THEN 10 ELSE 0 END) ON CONFLICT(user_id) DO UPDATE SET coins=game_wallets.coins+excluded.coins RETURNING coins INTO balance;
SELECT * INTO n FROM public.quiz_questions WHERE id=s.question_ids[s.position+1];
RETURN jsonb_build_object('sessionId',s.id,'position',s.position,'total',array_length(s.question_ids,1),'correct',s.correct,'coins',balance,'earned',CASE WHEN won THEN 10 ELSE 0 END,'wasCorrect',won,'correctAnswer',q.options->>q.answer,'explanation',q.explanation,'question',CASE WHEN n.id IS NULL THEN NULL ELSE jsonb_build_object('prompt',n.prompt,'options',n.options,'imageKey',n.image_key) END); END $$;
REVOKE ALL ON FUNCTION public.answer_sonic_quiz(uuid,integer,integer) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.answer_sonic_quiz(uuid,integer,integer) TO authenticated;
CREATE FUNCTION public.redeem_sonic_title(title_id_input text) RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE t public.sonic_titles; balance integer; uid uuid:=auth.uid(); BEGIN
IF uid IS NULL THEN RAISE EXCEPTION 'Inicia sesión'; END IF;
SELECT * INTO t FROM public.sonic_titles WHERE id=title_id_input; IF NOT FOUND THEN RAISE EXCEPTION 'Título no válido'; END IF;
INSERT INTO public.game_wallets(user_id) VALUES(uid) ON CONFLICT DO NOTHING;
SELECT coins INTO balance FROM public.game_wallets WHERE user_id=uid FOR UPDATE;
IF EXISTS(SELECT 1 FROM public.owned_titles WHERE user_id=uid AND title_id=t.id) THEN RAISE EXCEPTION 'Ya tienes este título'; END IF;
IF balance<t.price THEN RAISE EXCEPTION 'Necesitas más monedas'; END IF;
UPDATE public.game_wallets SET coins=coins-t.price WHERE user_id=uid RETURNING coins INTO balance;
INSERT INTO public.owned_titles VALUES(uid,t.id);
UPDATE public.profiles SET equipped_title=t.name WHERE id=uid;
RETURN balance; END $$;
REVOKE ALL ON FUNCTION public.redeem_sonic_title(text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.redeem_sonic_title(text) TO authenticated;
CREATE FUNCTION public.equip_sonic_title(title_id_input text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$ DECLARE title_name text; BEGIN
IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Inicia sesión'; END IF;
IF title_id_input IS NOT NULL THEN SELECT t.name INTO title_name FROM public.sonic_titles t JOIN public.owned_titles o ON o.title_id=t.id WHERE o.user_id=auth.uid() AND t.id=title_id_input; IF NOT FOUND THEN RAISE EXCEPTION 'Título no comprado'; END IF; END IF;
UPDATE public.profiles SET equipped_title=title_name WHERE id=auth.uid(); END $$;
REVOKE ALL ON FUNCTION public.equip_sonic_title(text) FROM PUBLIC,anon; GRANT EXECUTE ON FUNCTION public.equip_sonic_title(text) TO authenticated;