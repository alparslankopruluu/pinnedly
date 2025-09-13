# Supabase Database Setup

## Required Tables Setup

To fix the "Could not find the table 'public.profiles'" error, you need to create the required tables in your Supabase database.

### Steps:

1. **Go to your Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project: `fpdkpvzzduqnswrkdogd`

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Migration**
   - Copy the entire content from `supabase-migration.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the migration

### What this creates:

#### `profiles` table:
- Stores user profile information
- Links to Supabase auth users
- Includes handle, display_name, avatar, bio, etc.
- Has Row Level Security (RLS) enabled

#### `shares` table:
- Manages sharing permissions for entities
- Supports notes, bookmarks, lists, and projects
- Has view/edit permission levels
- Has Row Level Security (RLS) enabled

#### Security Policies:
- Users can view all profiles (public)
- Users can only edit their own profile
- Users can only see shares they created or received
- Proper access control for all operations

#### Performance Indexes:
- Optimized queries for handle and display name searches
- Fast lookups for sharing relationships

### After running the migration:

Your app should work without the "table not found" errors. You can now:
- Sign up new users
- Create profiles automatically
- Use the sharing system
- Search for users

### Troubleshooting:

If you still get errors after running the migration:
1. Check that all SQL commands executed successfully
2. Verify the tables exist in the "Table Editor"
3. Make sure RLS policies are active
4. Check your Supabase project URL and anon key in `lib/supabase.ts`