import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(req: NextRequest) {
  try {
    const { email, invited_by } = await req.json();
    
    if (!email || !invited_by) {
      return NextResponse.json(
        { error: "Email and invited_by are required" }, 
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // 1. Davet eden kullanıcının team_id'sini al
    const { data: inviterProfile, error: profileError } = await supabase
      .from("profiles")
      .select("team_id, id")
      .eq("id", invited_by)
      .single();

    if (profileError) {
      return NextResponse.json(
        { error: "Inviter profile not found" }, 
        { status: 404 }
      );
    }

    // 2. Önceki pending invite'ları expire et (aynı email için)
    await supabase
      .from("invites")
      .update({ status: "expired" })
      .eq("email", email)
      .eq("status", "pending");

    // 3. Yeni invite oluştur
    const { data: invite, error: inviteError } = await supabase
      .from("invites")
      .insert([
        { 
          email, 
          invited_by,
          team_id: inviterProfile.team_id, // null olabilir (superuser için)
          status: "pending"
        }
      ])
      .select()
      .single();

    if (inviteError) {
      return NextResponse.json(
        { error: inviteError.message }, 
        { status: 400 }
      );
    }

    // 4. GEÇICI: Email gönderme yerine console'a link yaz
    const inviteUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}?invite_id=${invite.id}`;
    
    console.log('\n🎉 INVITE CREATED!');
    console.log('📧 Email:', email);
    console.log('🔗 Invite Link:', inviteUrl);
    console.log('\n');

    // TODO: Email rate limit geçince aktif et
    // const { error: emailError } = await supabase.auth.signInWithOtp({
    //   email,
    //   options: {
    //     emailRedirectTo: inviteUrl,
    //   }
    // });

    return NextResponse.json({ 
      success: true,
      invite: invite,
      inviteUrl: inviteUrl, // Frontend'de göstermek için
      message: "Invite created (email disabled due to rate limit)"
    });

  } catch (error: any) {
    console.error("Invite API error:", error);
    return NextResponse.json(
      { error: error.message || "Internal server error" }, 
      { status: 500 }
    );
  }
}