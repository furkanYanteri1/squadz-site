# Squadz - Team-Based Social Media Platform

A minimal, team-centric social media platform built with Next.js 16 and Supabase. Users belong to teams, post on behalf of teams, and follow other teams—no individual profiles.

**Live Demo:** [https://squadz.space](https://squadz.space)

**Video Walkthroughs:**
- [Part 1: Architecture & Thought Process]
- https://drive.google.com/file/d/1rlf40XKKgYUKQvj-eAqUBioIfbMtFBXz/view?usp=drive_link
- [Part 2: Live Demo]
- https://drive.google.com/file/d/1LHm2YYulep9LlI1VyHuni6wmQCHThwtL/view?usp=drive_link
---

## 🎯 Core Concept

This platform is **team-based, not user-centric**. Every action is performed under a team identity:
- Users authenticate individually but act collectively as their team
- Posts, follows, and all content belong to teams, not individuals
- No role management within teams—all members share equal permissions

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Supabase account

### Installation

```bash
# Clone repository
git clone https://github.com/furkanYanteri1/squadz-site.git
cd squadz-site

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

### Environment Variables

Create `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_SUPERUSER_EMAIL=admin@example.com
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### Run Development Server

```bash
npm run dev
```

Visit `http://localhost:3000`

---

## 📊 Database Schema

### Tables

#### `profiles`
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  team_id UUID REFERENCES teams(id),
  invited_by UUID REFERENCES profiles(id),
  role TEXT DEFAULT 'member',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `teams`
```sql
CREATE TABLE teams (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `posts`
```sql
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  team_id UUID NOT NULL REFERENCES teams(id),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `follows`
```sql
CREATE TABLE follows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  follower_team_id UUID NOT NULL REFERENCES teams(id),
  following_team_id UUID NOT NULL REFERENCES teams(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_team_id, following_team_id),
  CHECK(follower_team_id != following_team_id)
);
```

#### `invites`
```sql
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL,
  invited_by UUID NOT NULL REFERENCES profiles(id),
  team_id UUID REFERENCES teams(id),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
```

### Row Level Security (RLS)

All tables have RLS enabled with the following policies:

**Posts:**
- ✅ Public read access (anyone can view feed)
- ✅ Team members can create posts for their team only
- ❌ No individual post ownership—posts belong to teams

**Follows:**
- ✅ Users can view their own team's follows
- ✅ Users can follow/unfollow on behalf of their team
- ❌ Cannot follow own team (DB constraint)

**Profiles:**
- ✅ Users can read/update their own profile
- ✅ Profile creation allowed during signup flow

**Invites:**
- ✅ Users can create invites
- ✅ Public read for invite acceptance flow
- ✅ Status tracking prevents reuse

---

## 🏗️ Architecture

### Tech Stack
- **Frontend:** Next.js 16 (App Router), React 19, TypeScript
- **Backend:** Supabase (Auth, PostgreSQL, RLS)
- **Styling:** TailwindCSS 4
- **Deployment:** Vercel

### Key Design Decisions

#### 1. Invite-Only Registration
- No public signup—all users must be invited
- **Superuser** (configured via env) can invite team founders
- **Team members** can invite new members to their team
- Invite links contain `invite_id` → opens dedicated onboarding flow

#### 2. Team-First Data Model
```typescript
// User has team context
interface User {
  id: string
  email: string
  role: 'superuser' | 'member'
  team_id?: string        // User's team
  team_name?: string      // Cached for UI
}

// Posts belong to teams, not users
interface Post {
  id: string
  team_id: string         // Owner team
  content: string
  teams: { name, avatar } // Join for display
}
```

#### 3. Client-Side State Management
- `UserContext` provides auth state globally
- Feed uses optimistic updates for follow actions
- No external state library—React Context + hooks sufficient for MVP

#### 4. Session Handling
- Supabase SSR package for cookie-based sessions
- Server components use `createServerClient` (cookies)
- Client components use `createBrowserClient`
- Logout clears both auth session and browser storage

---

## 🔐 Authentication Flow

### 1. Invite Flow (New User)
```
Superuser/Member → Create Invite
                ↓
        Email sent (Supabase Magic Link)
                ↓
        User clicks link → AcceptInviteDialog
                ↓
        Sets password + (optionally) team name
                ↓
        Profile created → User logged in
```

### 2. Login Flow (Existing User)
```
Email + Password → Supabase Auth
                ↓
        Session created → UserContext loaded
                ↓
        Profile + Team data fetched
                ↓
        User sees feed + can post
```

### 3. Google OAuth
Configured but not actively used in current deployment. Can be enabled via Supabase dashboard.

---

## 🎨 Features

### ✅ Implemented
- **Authentication:** Email/password with invite-only signup
- **Team System:** Users belong to one team, act on behalf of team
- **Posting:** Create text posts (500 char limit) as team
- **Follow System:** Follow/unfollow other teams
- **Feed Filtering:** Toggle between "All" and "Following" feeds
- **Public Feed:** No auth required to view posts
- **Invite Management:** Superuser and team members can invite
- **Session Persistence:** Proper cookie-based auth

### 🔄 Optimizations Applied
- **Optimistic Updates:** Follow buttons respond instantly
- **Event-Driven Refresh:** Post creation triggers feed update without reload
- **Race Condition Prevention:** Combined data loading eliminates timing issues
- **Disabled States:** Buttons locked during async operations

---

## 📁 Project Structure

```
src/
├── app/
│   ├── layout.tsx              # Root layout with UserProvider
│   ├── page.tsx                # Home feed (client component)
│   ├── globals.css             # Global styles
│   └── api/
│       └── invite/
│           └── route.ts        # Invite creation endpoint
├── components/
│   ├── Navbar.tsx              # Auth UI, invite button
│   ├── LoginDialog.tsx         # Email/password login
│   ├── AcceptInviteDialog.tsx  # Invite acceptance flow
│   ├── InviteDialog.tsx        # Send invite UI
│   ├── CreatePostDialog.tsx    # Post creation
│   └── FloatingPostButton.tsx  # FAB for posting
├── contexts/
│   └── UserContext.tsx         # Global auth state
└── lib/
    ├── supabase-client.ts      # Browser client
    └── supabase-server.ts      # Server client (SSR)
```

---

## 🐛 Known Issues & Trade-offs

### Current Limitations
1. **Email Sending:** Uses Supabase Auth's built-in emails—no custom templates yet
2. **No Image Uploads:** Posts are text-only (avatar support exists but unused)
3. **No Realtime:** Feed updates on manual refresh or post creation event
4. **No Pagination:** Feed limited to 50 most recent posts
5. **Minimal Error UX:** Errors logged to console, user feedback could be richer

### Trade-offs Made
- **No Role Management:** All team members have equal permissions (simpler model)
- **Invite-Only:** Prevents spam but requires manual user onboarding
- **Client-Heavy Feed:** Moved from server to client component for follow filtering
- **localStorage.clear() on Logout:** Nuclear option but guarantees clean state

---

## 🚀 What I'd Improve with More Time

### High Priority
1. **Realtime Updates:** Supabase Realtime subscriptions for live feed
2. **Pagination:** Infinite scroll or cursor-based pagination
3. **Image Support:** Team avatars, post images via Cloudinary/Supabase Storage
4. **Email Templates:** Custom branded invite emails
5. **Better Error Handling:** Toast notifications, retry logic

### Medium Priority
6. **User Search:** Find teams to follow by name
7. **Post Interactions:** Likes, comments, shares
8. **Notifications:** Follow notifications, new post alerts
9. **Admin Dashboard:** Superuser can manage all teams/users
10. **Analytics:** Track engagement, growth metrics

### Nice to Have
11. **Dark/Light Mode:** Theme toggle (currently dark only)
12. **Accessibility:** ARIA labels, keyboard navigation
13. **Performance:** React Query for caching, bundle optimization
14. **Testing:** Unit tests (Vitest), E2E tests (Playwright)

---

## 🧪 Testing the App

### Manual Test Flow

1. **Superuser Login:**
   - Email: `furkanyanteri@gmail.com`
   - Password: `[your_password]`

2. **Create Team:**
   - Click "Invite"
   - Enter new user email
   - Copy invite link from console (email rate limited during dev)
   - Open link in incognito/new browser
   - Set team name + password
   - User is now logged in

3. **Post as Team:**
   - Click floating `+` button (bottom-right)
   - Write post → Submit
   - Feed updates instantly (no reload)

4. **Follow Another Team:**
   - Create second user/team (repeat step 2)
   - Post from second team
   - First team sees post → clicks "Follow"
   - Switch to "Following" tab → see only followed team's posts

5. **Logout:**
   - Click "Logout" → should redirect to home cleanly

---

## 🔧 Troubleshooting

### Build Issues
```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Supabase Connection
- Verify `.env.local` has correct `NEXT_PUBLIC_SUPABASE_URL` and `ANON_KEY`
- Check Supabase project is not paused (free tier auto-pauses after inactivity)

### Authentication Issues
- Ensure Supabase Redirect URLs include your deployment domain
- Check browser doesn't block cookies (required for sessions)

---

## 📝 Development Notes

### Why Invite-Only?
- Prevents anonymous spam
- Ensures every user has team context
- Enables controlled growth (important for early-stage product)

### Why No Individual Profiles?
- Product focuses on team identity, not personal branding
- Simplifies permissions (no "who can see what" complexity)
- Aligns with real-world use case: company/org social accounts

### Why Client-Side Feed?
- Initial design was server component, but:
  - Follow filtering requires user context
  - Optimistic updates need client state
  - Trade-off: Slightly slower initial load, but better interactivity

### TypeScript Quirks
- Supabase types sometimes infer arrays instead of objects for joins
- Solution: Explicit type casting in `loadData()` function
- Filed internally as improvement area for Supabase client

---

## 📄 License

This project is for evaluation purposes. All code remains the intellectual property of the author.

---

## 🙏 Acknowledgments

Built as part of Vizio Ventures technical evaluation.

**Tech Stack:**
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [TailwindCSS](https://tailwindcss.com/)
- [Vercel](https://vercel.com/)

---

**Questions?** Reach out via the repository issues or email.
