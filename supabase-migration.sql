-- Drop existing tables if they exist (to start fresh)
DROP TABLE IF EXISTS public.project_members;
DROP TABLE IF EXISTS public.tasks;
DROP TABLE IF EXISTS public.projects;
DROP TABLE IF EXISTS public.notes;
DROP TABLE IF EXISTS public.bookmarks;
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

-- Create projects table
CREATE TABLE public.projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  cover_image TEXT,
  deadline TIMESTAMP WITH TIME ZONE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tasks table
CREATE TABLE public.tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in-progress', 'done')),
  due_date TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create project_members table
CREATE TABLE public.project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  permission TEXT DEFAULT 'view' CHECK (permission IN ('view', 'edit')),
  invited_by UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- Create bookmarks table
CREATE TABLE public.bookmarks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  url TEXT,
  title TEXT,
  description TEXT,
  image_preview TEXT,
  screenshot_uri TEXT,
  open_count INTEGER DEFAULT 0,
  last_opened_at TIMESTAMP WITH TIME ZONE,
  source TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create notes table
CREATE TABLE public.notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  markdown TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  visibility TEXT DEFAULT 'private' CHECK (visibility IN ('private', 'public', 'unlisted')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
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
CREATE POLICY "Anyone can view public lists" ON public.bookmark_lists
  FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view own lists" ON public.bookmark_lists
  FOR SELECT USING (auth.uid() = owner_id);

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

-- Create policies for projects table
CREATE POLICY "Users can view projects they own or are members of" ON public.projects
  FOR SELECT USING (
    auth.uid() = owner_id OR 
    EXISTS (
      SELECT 1 FROM public.project_members 
      WHERE project_id = id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create own projects" ON public.projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update projects they own" ON public.projects
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete projects they own" ON public.projects
  FOR DELETE USING (auth.uid() = owner_id);

-- Create policies for tasks table
CREATE POLICY "Users can view tasks in projects they have access to" ON public.tasks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_id AND (
        p.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.project_members pm 
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Users can create tasks in projects they have edit access to" ON public.tasks
  FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_id AND (
        p.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.project_members pm 
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.permission = 'edit'
        )
      )
    )
  );

CREATE POLICY "Users can update tasks in projects they have edit access to" ON public.tasks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_id AND (
        p.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.project_members pm 
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.permission = 'edit'
        )
      )
    )
  );

CREATE POLICY "Users can delete tasks in projects they have edit access to" ON public.tasks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_id AND (
        p.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.project_members pm 
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid() AND pm.permission = 'edit'
        )
      )
    )
  );

-- Create policies for project_members table
CREATE POLICY "Users can view project members for projects they have access to" ON public.project_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.projects p 
      WHERE p.id = project_id AND (
        p.owner_id = auth.uid() OR 
        EXISTS (
          SELECT 1 FROM public.project_members pm 
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
      )
    )
  );

CREATE POLICY "Project owners can manage members" ON public.project_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.projects 
      WHERE id = project_id AND owner_id = auth.uid()
    )
  );

-- Create policies for bookmarks table
CREATE POLICY "Users can view own bookmarks" ON public.bookmarks
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own bookmarks" ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own bookmarks" ON public.bookmarks
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own bookmarks" ON public.bookmarks
  FOR DELETE USING (auth.uid() = owner_id);

-- Create policies for notes table
CREATE POLICY "Users can view own notes" ON public.notes
  FOR SELECT USING (auth.uid() = owner_id);

CREATE POLICY "Users can create own notes" ON public.notes
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update own notes" ON public.notes
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Users can delete own notes" ON public.notes
  FOR DELETE USING (auth.uid() = owner_id);

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

-- Create triggers for updated_at timestamps
CREATE TRIGGER projects_updated_at
  BEFORE UPDATE ON public.projects
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER bookmarks_updated_at
  BEFORE UPDATE ON public.bookmarks
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER notes_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

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
CREATE INDEX IF NOT EXISTS projects_owner_id_idx ON public.projects(owner_id);
CREATE INDEX IF NOT EXISTS projects_created_at_idx ON public.projects(created_at);
CREATE INDEX IF NOT EXISTS tasks_project_id_idx ON public.tasks(project_id);
CREATE INDEX IF NOT EXISTS tasks_assigned_to_idx ON public.tasks(assigned_to);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks(status);
CREATE INDEX IF NOT EXISTS project_members_project_id_idx ON public.project_members(project_id);
CREATE INDEX IF NOT EXISTS project_members_user_id_idx ON public.project_members(user_id);
CREATE INDEX IF NOT EXISTS bookmarks_owner_id_idx ON public.bookmarks(owner_id);
CREATE INDEX IF NOT EXISTS notes_owner_id_idx ON public.notes(owner_id);
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
GRANT ALL ON public.projects TO anon, authenticated;
GRANT ALL ON public.tasks TO anon, authenticated;
GRANT ALL ON public.project_members TO anon, authenticated;
GRANT ALL ON public.bookmarks TO anon, authenticated;
GRANT ALL ON public.notes TO anon, authenticated;
GRANT ALL ON public.bookmark_lists TO anon, authenticated;
GRANT ALL ON public.list_followers TO anon, authenticated;
GRANT ALL ON public.shares TO anon, authenticated;