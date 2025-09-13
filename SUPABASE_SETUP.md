# Supabase Database Setup

## CRITICAL: Fix RLS Policy Errors

To fix the "new row violates row-level security policy" error, you need to run the updated migration.

### Steps:

1. **Go to your Supabase Dashboard**
   - Visit https://supabase.com/dashboard
   - Select your project: `fpdkpvzzduqnswrkdogd`

2. **Open SQL Editor**
   - Click on "SQL Editor" in the left sidebar
   - Click "New query"

3. **Run the Updated Migration**
   - Copy the ENTIRE content from `supabase-migration.sql`
   - Paste it into the SQL editor
   - Click "Run" to execute the migration
   - This will drop and recreate the tables with proper RLS policies

4. **Verify Tables Created**
   - Go to "Table Editor" in the left sidebar
   - You should see `profiles` and `shares` tables
   - Check that RLS is enabled (you'll see a shield icon)

### IMPORTANT: What the migration does:

- **Drops existing tables** (if any) to start fresh
- **Creates profiles table** with proper structure
- **Creates shares table** for sharing functionality
- **Sets up RLS policies** that allow:
  - Users to insert their own profile (auth.uid() = id)
  - Users to view all profiles
  - Users to update only their own profile
- **Creates indexes** for performance
- **Grants permissions** to anon and authenticated users

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

If you still get RLS policy errors after running the migration:

1. **Check SQL execution**
   - Make sure ALL SQL commands executed successfully
   - Look for any red error messages in the SQL editor
   - If there are errors, run the migration again

2. **Verify tables and policies**
   - Go to "Table Editor" → select `profiles` table
   - Click on "RLS policies" tab
   - You should see 3 policies: view all, update own, insert own

3. **Check your credentials**
   - Verify your Supabase project URL and anon key in `lib/supabase.ts`
   - Make sure you're using the correct project

4. **Test with a fresh user**
   - Try signing up with a completely new email
   - The profile should be created automatically

### Common Issues:

- **"Could not find table"**: Run the migration SQL
- **"RLS policy violation"**: The migration wasn't run properly or policies are missing
- **"Failed to create profile"**: Check that the `profiles` table exists and has the correct RLS policies