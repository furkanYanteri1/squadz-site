This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

/supabase remove user
-- test@test.com ve tüm ilişkili kayıtları sil
DO $$
DECLARE
  user_id UUID;
  user_team_id UUID;
BEGIN
  -- User ID'yi al
  SELECT id INTO user_id FROM auth.users WHERE email = 'test@test.com';
  
  IF user_id IS NOT NULL THEN
    -- Team ID'yi al
    SELECT team_id INTO user_team_id FROM profiles WHERE id = user_id;
    
    -- İlişkili kayıtları temizle
    DELETE FROM invites WHERE invited_by = user_id OR email = 'test@test.com';
    DELETE FROM posts WHERE team_id = user_team_id;
    DELETE FROM profiles WHERE id = user_id;
    
    -- Auth'dan sil
    DELETE FROM auth.users WHERE id = user_id;
    
    RAISE NOTICE 'User deleted successfully';
  ELSE
    RAISE NOTICE 'User not found';
  END IF;
END $$;