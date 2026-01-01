import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getAuthenticatedAgent } from "@/lib/auth/get-agent";
import { z } from "zod";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, "יש להזין סיסמה נוכחית"),
  newPassword: z.string().min(6, "הסיסמה החדשה חייבת להכיל לפחות 6 תווים"),
});

// PUT - Change password
export async function PUT(request: NextRequest) {
  try {
    const authResult = await getAuthenticatedAgent();
    if (!authResult.success) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const body = await request.json();
    const validation = changePasswordSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { currentPassword, newPassword } = validation.data;

    const supabase = createServiceClient();

    // First verify the current password by attempting to sign in
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authResult.agent.email,
      password: currentPassword,
    });

    if (signInError) {
      return NextResponse.json(
        { error: "הסיסמה הנוכחית שגויה" },
        { status: 400 }
      );
    }

    // Update the password
    const { error: updateError } = await supabase.auth.admin.updateUserById(
      authResult.agent.userId,
      { password: newPassword }
    );

    if (updateError) {
      console.error("Password update error:", updateError);
      return NextResponse.json(
        { error: "שגיאה בשינוי הסיסמה" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Change password error:", error);
    return NextResponse.json(
      { error: "שגיאה בשינוי הסיסמה" },
      { status: 500 }
    );
  }
}
