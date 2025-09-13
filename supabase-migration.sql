-- Drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS public.list_followers;
DROP TABLE IF EXISTS public.bookmark_lists;
DROP TABLE IF EXISTS public.shares;
DROP TABLE IF EXISTS public.profiles;

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  handle TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  avatar_url TEXT,
  bio TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  follower_count INTEGER DEFAULT 0,
  following_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create bookmark_lists table
CREATE TABLE public.bookmark_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT FALSE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  follower_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create list_followers table
CREATE TABLE public.list_followers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID REFERENCES public.bookmark_lists(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(list_id, user_id)
);

-- Create shares table
CREATE TABLE public.shares (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_id UUID NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('note', 'bookmark', 'list', 'project')),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('view', 'edit')),
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmark_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.list_followers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view public lists and own lists" ON public.bookmark_lists;
DROP POLICY IF EXISTS "Users can create own lists" ON public.bookmark_lists;
DROP POLICY IF EXISTS "Users can update own lists" ON public.bookmark_lists;
DROP POLICY IF EXISTS "Users can delete own lists" ON public.bookmark_lists;
DROP POLICY IF EXISTS "Users can view list followers" ON public.list_followers;
DROP POLICY IF EXISTS "Users can follow lists" ON public.list_followers;
DROP POLICY IF EXISTS "Users can unfollow lists" ON public.list_followers;
DROP POLICY IF EXISTS "Users can view shares where they are recipient or creator" ON public.shares;
DROP POLICY IF EXISTS "Users can create shares" ON public.shares;
DROP POLICY IF EXISTS "Users can delete shares they created" ON public.shares;

-- Create policies for profiles table
CREATE POLICY "Users can view all profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Create policies for bookmark_lists table
CREATE POLICY "Users can view public lists and own lists" ON public.bookmark_lists
  FOR SELECT USING (is_public = true OR auth.uid() = owner_id);

CREATE POLICY "Users can create own lists" ON public.bookmark_lists
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own lists" ON public.bookmark_lists
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own lists" ON public.bookmark_lists
  FOR DELETE USING (auth.uid() = owner_id);

-- Create policies for list_followers table
CREATE POLICY "Users can view list followers" ON public.list_followers
  FOR SELECT USING (true);

CREATE POLICY "Users can follow lists" ON public.list_followers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can unfollow lists" ON public.list_followers
  FOR DELETE USING (auth.uid() = user_id);

-- Create policies for shares table
CREATE POLICY "Users can view shares where they are recipient or creator" ON public.shares
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = created_by);

CREATE POLICY "Users can create shares" ON public.shares
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete shares they created" ON public.shares
  FOR DELETE USING (auth.uid() = created_by);

-- Create function to handle updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for profiles updated_at
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create trigger for bookmark_lists updated_at
CREATE TRIGGER bookmark_lists_updated_at
  BEFORE UPDATE ON public.bookmark_lists
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Create function to update follower count
CREATE OR REPLACE FUNCTION public.update_list_follower_count()
RETURNS TRIGGER AS $
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.bookmark_lists 
    SET follower_count = follower_count + 1 
    WHERE id = NEW.list_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.bookmark_lists 
    SET follower_count = follower_count - 1 
    WHERE id = OLD.list_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$ LANGUAGE plpgsql;

-- Create trigger for follower count updates
CREATE TRIGGER list_followers_count_trigger
  AFTER INSERT OR DELETE ON public.list_followers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_list_follower_count();

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS profiles_handle_idx ON public.profiles(handle);
CREATE INDEX IF NOT EXISTS profiles_display_name_idx ON public.profiles(display_name);
CREATE INDEX IF NOT EXISTS bookmark_lists_owner_id_idx ON public.bookmark_lists(owner_id);
CREATE INDEX IF NOT EXISTS bookmark_lists_is_public_idx ON public.bookmark_lists(is_public);
CREATE INDEX IF NOT EXISTS bookmark_lists_name_idx ON public.bookmark_lists(name);
CREATE INDEX IF NOT EXISTS list_followers_list_id_idx ON public.list_followers(list_id);
CREATE INDEX IF NOT EXISTS list_followers_user_id_idx ON public.list_followers(user_id);
CREATE INDEX IF NOT EXISTS shares_user_id_idx ON public.shares(user_id);
CREATE INDEX IF NOT EXISTS shares_created_by_idx ON public.shares(created_by);
CREATE INDEX IF NOT EXISTS shares_entity_idx ON public.shares(entity_id, entity_type);

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.profiles TO anon, authenticated;
GRANT ALL ON public.bookmark_lists TO anon, authenticated;
GRANT ALL ON public.list_followers TO anon, authenticated;
GRANT ALL ON public.shares TO anon, authenticated;