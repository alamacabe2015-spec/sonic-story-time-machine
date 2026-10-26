CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  display_name text NOT NULL DEFAULT '',
  avatar_url text,
  bio text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles read" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles update own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles insert own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (NEW.id, lower(coalesce(NEW.raw_user_meta_data->>'username', split_part(NEW.email,'@',1))),
          coalesce(NEW.raw_user_meta_data->>'display_name',''), NEW.raw_user_meta_data->>'avatar_url');
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE TABLE public.news (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  summary text NOT NULL,
  published_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.news TO authenticated;
GRANT ALL ON public.news TO service_role;
ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "news read" ON public.news FOR SELECT TO authenticated USING (true);

CREATE TABLE public.year_news (
  year int PRIMARY KEY,
  items jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.year_news TO authenticated;
GRANT ALL ON public.year_news TO service_role;
ALTER TABLE public.year_news ENABLE ROW LEVEL SECURITY;
CREATE POLICY "year news read" ON public.year_news FOR SELECT TO authenticated USING (true);

CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester uuid NOT NULL,
  addressee uuid NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (requester, addressee)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "fr read" ON public.friendships FOR SELECT TO authenticated USING (auth.uid() IN (requester, addressee));
CREATE POLICY "fr insert" ON public.friendships FOR INSERT TO authenticated WITH CHECK (auth.uid() = requester AND status = 'pending' AND requester <> addressee);
CREATE POLICY "fr accept" ON public.friendships FOR UPDATE TO authenticated USING (auth.uid() = addressee) WITH CHECK (auth.uid() = addressee);
CREATE POLICY "fr delete" ON public.friendships FOR DELETE TO authenticated USING (auth.uid() IN (requester, addressee));

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender uuid NOT NULL,
  receiver uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "msg read" ON public.messages FOR SELECT TO authenticated USING (auth.uid() IN (sender, receiver));
CREATE POLICY "msg insert" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender AND EXISTS (SELECT 1 FROM public.friendships f WHERE f.status='accepted' AND
   ((f.requester=sender AND f.addressee=receiver) OR (f.requester=receiver AND f.addressee=sender))));

ALTER PUBLICATION supabase_realtime ADD TABLE public.news;
ALTER PUBLICATION supabase_realtime ADD TABLE public.friendships;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

CREATE POLICY "avatar read" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatar upload" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "avatar update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

INSERT INTO public.news (title, summary, published_at) VALUES
('Sonic Racing: CrossWorlds ya está disponible', 'El nuevo juego de carreras de Sonic llegó en septiembre de 2025 con viajes entre mundos y personajes invitados.', '2025-09-25'),
('Sonic X Shadow Generations arrasa en ventas', 'La remasterización con la nueva aventura de Shadow superó los 2 millones de copias.', '2024-11-20'),
('Sonic 3: La Película, éxito en cines', 'Shadow debutó en la gran pantalla y la película se convirtió en la más taquillera de la saga.', '2024-12-20'),
('Confirmada Sonic 4: La Película', 'Paramount anunció la cuarta película de Sonic para marzo de 2027.', '2025-02-15'),
('Sonic cumple 35 años', 'SEGA celebra el aniversario del erizo azul con eventos y sorpresas para los fans.', '2026-06-23');