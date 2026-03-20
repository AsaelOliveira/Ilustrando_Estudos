import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type UserRole = "admin" | "professor" | "coordenadora" | "aluno";

type ManageUsersPayload =
  | {
      action: "create_user";
      email: string;
      password: string;
      nome: string;
      turma_id: string;
      role?: UserRole;
      turma_ids?: string[];
      assignments?: Array<{ turma_id: string; disciplina_id: string }>;
    }
  | { action: "batch_create"; users: Array<{ email: string; password?: string; nome: string; turma_id: string }> }
  | { action: "list_users" }
  | { action: "reset_password"; user_id: string; new_password?: string }
  | { action: "reset_progress"; user_id: string; admin_secret: string }
  | { action: "delete_user"; user_id: string; admin_secret: string };

type ListedProfile = {
  user_id: string;
  nome: string;
  login_identifier?: string | null;
  turma_id: string | null;
  avatar_url: string | null;
  created_at: string;
};

type RoleRow = {
  user_id: string;
  role: UserRole;
};

type AuthListUser = {
  id: string;
  email?: string;
  created_at?: string;
  user_metadata?: {
    nome?: string;
  } | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generatePassword() {
  const alphabet = "abcdefghijkmnpqrstuvwxyz23456789ABCDEFGHJKLMNPQRSTUVWXYZ";
  const bytes = crypto.getRandomValues(new Uint8Array(10));

  return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
}

async function generateUniqueLoginIdentifier(supabase: ReturnType<typeof createClient>) {
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  const base = `aluno_${Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 6)}`;
  let candidate = base;
  let counter = 2;

  while (true) {
    const { data } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("login_identifier", candidate)
      .maybeSingle();

    if (!data) return candidate;
    candidate = `${base}_${counter}`;
    counter += 1;
  }
}

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function ensureAdminSecret(expectedSecret: string, receivedSecret?: string) {
  if (!receivedSecret || receivedSecret !== expectedSecret) {
    throw new Error("Chave administrativa invalida.");
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const defaultAvatarStyle = {
      skin: "skin-aurora",
      hair: "hair-neo",
      eyes: "eyes-spark",
      outfit: "outfit-campus",
      boots: "boots-dash",
      accessory: "accessory-pin",
      aura: "aura-none",
    };
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const adminSecret = getRequiredEnv("MANAGE_USERS_ADMIN_SECRET");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Not authenticated");

    const jwt = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
      error: callerError,
    } = await supabase.auth.getUser(jwt);
    if (callerError || !caller) throw new Error("Not authenticated");

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id)
      .eq("role", "admin")
      .single();
    if (!roleData) throw new Error("Not authorized");

    const payload = (await req.json()) as ManageUsersPayload;

    if (payload.action === "create_user") {
      const { email, password, nome, turma_id, role, turma_ids, assignments } = payload;
      const loginIdentifier = await generateUniqueLoginIdentifier(supabase);
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { nome, turma_id },
      });
      if (error) throw error;

      await supabase.from("profiles").upsert({
        user_id: data.user.id,
        nome,
        turma_id,
        login_identifier: loginIdentifier,
      }, { onConflict: "user_id" });
      await supabase.from("student_scores").upsert({
        user_id: data.user.id,
        turma_id,
        points: 0,
        missions_completed: 0,
        streak_days: 0,
      }, { onConflict: "user_id" });
      await supabase.from("user_roles").insert({ user_id: data.user.id, role: role || "aluno" });
      if (role === "professor" && turma_ids?.length) {
        await supabase.from("professor_turmas").insert(
          turma_ids.map((linkedTurmaId) => ({ user_id: data.user.id, turma_id: linkedTurmaId })),
        );
      }
      if (role === "professor" && assignments?.length) {
        await supabase.from("professor_assignments").insert(
          assignments.map((assignment) => ({
            user_id: data.user.id,
            disciplina_id: assignment.disciplina_id,
            turma_id: assignment.turma_id,
          })),
        );
      }

      return jsonResponse({
        success: true,
        user_id: data.user.id,
        credential: {
          user_id: data.user.id,
          nome,
          email,
          turma_id,
          login_identifier: loginIdentifier,
          password,
        },
      });
    }

    if (payload.action === "batch_create") {
      const results = {
        success: 0,
        errors: [] as string[],
        credentials: [] as Array<{
          user_id: string;
          nome: string;
          email: string;
          turma_id: string;
          password: string;
        }>,
      };

      for (const userToCreate of payload.users) {
        const password = userToCreate.password || generatePassword();
        const loginIdentifier = await generateUniqueLoginIdentifier(supabase);
        const { data, error } = await supabase.auth.admin.createUser({
          email: userToCreate.email,
          password,
          email_confirm: true,
          user_metadata: { nome: userToCreate.nome, turma_id: userToCreate.turma_id },
        });

        if (error) {
          results.errors.push(`${userToCreate.email}: ${error.message}`);
          continue;
        }

        await supabase.from("profiles").upsert({
          user_id: data.user.id,
          nome: userToCreate.nome,
          turma_id: userToCreate.turma_id,
          login_identifier: loginIdentifier,
        }, { onConflict: "user_id" });
        await supabase.from("student_scores").upsert({
          user_id: data.user.id,
          turma_id: userToCreate.turma_id,
          points: 0,
          missions_completed: 0,
          streak_days: 0,
        }, { onConflict: "user_id" });
        await supabase.from("user_roles").insert({ user_id: data.user.id, role: "aluno" });

        results.credentials.push({
          user_id: data.user.id,
          nome: userToCreate.nome,
          email: userToCreate.email,
          turma_id: userToCreate.turma_id,
          login_identifier: loginIdentifier,
          password,
        });
        results.success++;
      }

      return jsonResponse(results);
    }

    if (payload.action === "list_users") {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("user_id, nome, login_identifier, turma_id, avatar_url, created_at")
        .order("created_at", { ascending: false });

      const { data: roleRows } = await supabase.from("user_roles").select("user_id, role");
      const normalizedRoleMap = new Map<string, UserRole>();
      for (const roleRow of (roleRows as RoleRow[] | null | undefined) ?? []) {
        normalizedRoleMap.set(roleRow.user_id, roleRow.role);
      }

      const {
        data: { users: authUsers },
      } = await supabase.auth.admin.listUsers({ perPage: 1000 });
      const emailMap = new Map<string, string>();
      for (const authUser of (authUsers as AuthListUser[] | null | undefined) ?? []) {
        emailMap.set(authUser.id, authUser.email ?? "");
      }

      const profileMap = new Map<string, ListedProfile>();
      for (const profileRow of (profileRows as ListedProfile[] | null | undefined) ?? []) {
        profileMap.set(profileRow.user_id, profileRow);
      }

      const enriched = ((authUsers as AuthListUser[] | null | undefined) ?? []).map((authUser) => {
        const profileRow = profileMap.get(authUser.id);

        return {
          user_id: authUser.id,
          nome: profileRow?.nome || authUser.user_metadata?.nome || authUser.email || "Aluno",
          email: authUser.email ?? "",
          turma_id: profileRow?.turma_id ?? null,
          login_identifier: profileRow?.login_identifier ?? null,
          avatar_url: profileRow?.avatar_url ?? null,
          role: normalizedRoleMap.get(authUser.id) ?? "aluno",
          created_at: profileRow?.created_at || authUser.created_at || new Date(0).toISOString(),
        };
      });

      enriched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      return jsonResponse(enriched);
    }

    if (payload.action === "reset_password") {
      const { user_id, new_password } = payload;
      const nextPassword = new_password?.trim() || generatePassword();
      const { error } = await supabase.auth.admin.updateUserById(user_id, { password: nextPassword });
      if (error) throw error;

      return jsonResponse({ success: true, password: nextPassword });
    }

    if (payload.action === "reset_progress") {
      const { user_id, admin_secret } = payload;
      ensureAdminSecret(adminSecret, admin_secret);

      const { data: profile } = await supabase
        .from("profiles")
        .select("turma_id")
        .eq("user_id", user_id)
        .maybeSingle();

      const { error: attemptsError } = await supabase
        .from("mission_attempts")
        .delete()
        .eq("user_id", user_id);
      if (attemptsError) throw attemptsError;

      const { error: scoreError } = await supabase
        .from("student_scores")
        .upsert({
          user_id,
          turma_id: profile?.turma_id || "6ano",
          points: 0,
          missions_completed: 0,
          streak_days: 0,
          last_mission_date: null,
        }, { onConflict: "user_id" });
      if (scoreError) throw scoreError;

      const { error: profileResetError } = await supabase
        .from("profiles")
        .update({
          avatar_unlocks: [],
          avatar_shop_spent: 0,
          avatar_style: defaultAvatarStyle,
          avatar_url: null,
        })
        .eq("user_id", user_id);
      if (profileResetError) throw profileResetError;

      return jsonResponse({ success: true });
    }

    if (payload.action === "delete_user") {
      const { user_id, admin_secret } = payload;
      ensureAdminSecret(adminSecret, admin_secret);

      const { error } = await supabase.auth.admin.deleteUser(user_id);
      if (error) throw error;

      return jsonResponse({ success: true });
    }

    throw new Error("Unknown action");
  } catch (error) {
    return jsonResponse({ error: error instanceof Error ? error.message : "Unknown error" }, 400);
  }
});
