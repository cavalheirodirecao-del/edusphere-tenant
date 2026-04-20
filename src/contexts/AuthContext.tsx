import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "gestor" | "aluno";

interface ProfileInfo {
  id: string;
  tenant_id: string;
  username: string;
  full_name: string | null;
  store: string | null;
  is_active: boolean;
  tenant_slug: string;
  tenant_name: string;
  tenant_is_catalog: boolean;
}

interface AuthCtx {
  session: Session | null;
  user: User | null;
  profile: ProfileInfo | null;
  role: AppRole | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileInfo | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = async (uid: string) => {
    const [{ data: prof }, { data: roleRow }] = await Promise.all([
      supabase
        .from("profiles")
        .select("id, tenant_id, username, full_name, store, is_active, tenants:tenant_id(slug, name)")
        .eq("id", uid)
        .maybeSingle(),
      supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", uid)
        .maybeSingle(),
    ]);

    if (prof && prof.tenants) {
      const t = prof.tenants as unknown as { slug: string; name: string };
      setProfile({
        id: prof.id,
        tenant_id: prof.tenant_id,
        username: prof.username,
        full_name: prof.full_name,
        store: (prof as { store: string | null }).store,
        is_active: (prof as { is_active: boolean }).is_active,
        tenant_slug: t.slug,
        tenant_name: t.name,
      });
    } else {
      setProfile(null);
    }
    setRole((roleRow?.role as AppRole) ?? null);
  };

  useEffect(() => {
    // 1) listener primeiro
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      if (sess?.user) {
        // adiar chamadas que usam supabase para não bloquear callback
        setTimeout(() => loadProfile(sess.user.id), 0);
      } else {
        setProfile(null);
        setRole(null);
      }
    });

    // 2) checa sessão atual
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      if (data.session?.user) {
        await loadProfile(data.session.user.id);
      }
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setProfile(null);
    setRole(null);
  };

  const refresh = async () => {
    if (user) await loadProfile(user.id);
  };

  return (
    <Ctx.Provider value={{ session, user, profile, role, loading, signOut, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useAuth must be used inside AuthProvider");
  return c;
}