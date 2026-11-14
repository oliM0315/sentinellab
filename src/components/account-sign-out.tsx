import { useRouter, useNavigate } from "@tanstack/react-router";
import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AccountSignOut() {
  const router = useRouter();
  const navigate = useNavigate();
  return <Button variant="outline" size="sm" onClick={async () => {
    const client = router.options.context.queryClient;
    await client.cancelQueries(); client.clear();
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error(error.message); return; }
    await navigate({ to: "/auth", replace: true });
  }}><LogOut />Sign out</Button>;
}