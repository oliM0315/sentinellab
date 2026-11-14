import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { canManageAccounts } from "./account-access";
import { z } from "zod";

export const getAccount = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const [profile, approval, role] = await Promise.all([
    context.supabase.from("profiles").select("*").eq("id", context.userId).single(),
    context.supabase.from("account_approvals").select("status").eq("user_id", context.userId).single(),
    context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" }),
  ]);
  if (profile.error || approval.error || role.error) throw new Error("Unable to load account. Please try again.");
  return { profile: profile.data, status: approval.data.status, isAdmin: role.data === true };
});

export const listAccounts = createServerFn({ method: "GET" }).middleware([requireSupabaseAuth]).handler(async ({ context }) => {
  const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  const approval = await context.supabase.from("account_approvals").select("status").eq("user_id", context.userId).single();
  if (role.error || approval.error || !canManageAccounts(role.data === true, approval.data?.status)) throw new Error("Administrator access required.");
  const { data, error } = await context.supabase.from("profiles").select("id,email,display_name,created_at,account_approvals(status)").order("created_at", { ascending: false });
  if (error) throw new Error("Unable to load accounts.");
  return data;
});

export const reviewAccount = createServerFn({ method: "POST" }).middleware([requireSupabaseAuth])
  .inputValidator(z.object({ userId: z.string().uuid(), status: z.enum(["approved", "rejected"]) }))
  .handler(async ({ context, data }) => {
    const role = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
    const approval = await context.supabase.from("account_approvals").select("status").eq("user_id", context.userId).single();
    if (role.error || approval.error || !canManageAccounts(role.data === true, approval.data?.status)) throw new Error("Administrator access required.");
    const targetRole = await context.supabase.rpc("has_role", { _user_id: data.userId, _role: "admin" });
    if (targetRole.error || targetRole.data) throw new Error("Administrator accounts cannot be changed here.");
    const { data: updated, error } = await context.supabase.from("account_approvals").update({ status: data.status, reviewed_by: context.userId, reviewed_at: new Date().toISOString() }).eq("user_id", data.userId).select("user_id").single();
    if (error || !updated) throw new Error("Unable to update approval.");
    return { success: true };
  });