import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type SignupRosterEntry = {
  nome: string;
  turma_id: string;
  email: string;
  claimed_user_id?: string | null;
  claimed_at?: string | null;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getRequiredEnv(name: string) {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
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

async function findExistingUserByEmail(supabase: ReturnType<typeof createClient>, email: string) {
  const { data, error } = await supabase.auth.admin.listUsers();
  if (error) throw error;
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase()) ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const payload = await req.json();
    const nome = typeof payload?.nome === "string" ? payload.nome.trim() : "";
    const password = typeof payload?.password === "string" ? payload.password.trim() : "";
    const previewOnly = payload?.mode === "preview";

    if (!nome) {
      return jsonResponse({ error: "Preencha o nome completo." }, 400);
    }

    if (!previewOnly && !password) {
      return jsonResponse({ error: "Preencha nome completo e senha." }, 400);
    }

    if (!previewOnly && password.length < 6) {
      return jsonResponse({ error: "A senha precisa ter pelo menos 6 caracteres." }, 400);
    }

    const { data: rosterSetting, error: rosterError } = await supabase
      .from("app_settings")
      .select("value")
      .eq("key", "student_signup_roster")
      .maybeSingle();

    if (rosterError) throw rosterError;

    const roster = Array.isArray(rosterSetting?.value) ? (rosterSetting.value as SignupRosterEntry[]) : [];
    const matchingEntries = roster.filter(
      (entry) =>
        typeof entry?.nome === "string" &&
        typeof entry?.turma_id === "string" &&
        normalizeName(entry.nome) === normalizeName(nome),
    );

    if (matchingEntries.length === 0) {
      return jsonResponse({ error: "Aluno nao encontrado na lista autorizada." }, 404);
    }

    if (matchingEntries.length > 1) {
      return jsonResponse({ error: "Existe mais de um cadastro com esse nome. Procure o admin." }, 409);
    }

    const rosterEntry = matchingEntries[0];
    const targetIndex = roster.findIndex(
      (entry) =>
        typeof entry?.nome === "string" &&
        typeof entry?.turma_id === "string" &&
        typeof entry?.email === "string" &&
        normalizeName(entry.nome) === normalizeName(rosterEntry.nome) &&
        entry.turma_id === rosterEntry.turma_id &&
        entry.email.toLowerCase() === rosterEntry.email.toLowerCase(),
    );

    if (targetIndex === -1) {
      return jsonResponse({ error: "Nao foi possivel localizar esse cadastro na lista autorizada." }, 404);
    }

    if (rosterEntry.claimed_user_id) {
      return jsonResponse({ error: "Esse cadastro ja foi ativado. Se perdeu a senha, procure o admin." }, 409);
    }

    const existingUser = await findExistingUserByEmail(supabase, rosterEntry.email);
    if (existingUser) {
      return jsonResponse({ error: "Esse cadastro ja foi ativado. Se perdeu a senha, procure o admin." }, 409);
    }

    const resolvedTurmaId = rosterEntry.turma_id;

    if (previewOnly) {
      return jsonResponse({
        success: true,
        turma_id: resolvedTurmaId,
      });
    }

    const loginIdentifier = await generateUniqueLoginIdentifier(supabase);
    const { data: createdUserData, error: createUserError } = await supabase.auth.admin.createUser({
      email: rosterEntry.email,
      password,
      email_confirm: true,
      user_metadata: {
        nome: rosterEntry.nome,
        turma_id: resolvedTurmaId,
      },
    });

    if (createUserError) {
      return jsonResponse({ error: createUserError.message }, 400);
    }

    const createdUser = createdUserData.user;

    const { error: profileError } = await supabase.from("profiles").upsert(
      {
        user_id: createdUser.id,
        nome: rosterEntry.nome,
        turma_id: resolvedTurmaId,
        login_identifier: loginIdentifier,
      },
      { onConflict: "user_id" },
    );
    if (profileError) throw profileError;

    const { error: scoreError } = await supabase.from("student_scores").upsert(
      {
        user_id: createdUser.id,
        turma_id: resolvedTurmaId,
        points: 0,
        missions_completed: 0,
        streak_days: 0,
      },
      { onConflict: "user_id" },
    );
    if (scoreError) throw scoreError;

    const { error: roleError } = await supabase.from("user_roles").insert({
      user_id: createdUser.id,
      role: "aluno",
    });
    if (roleError) throw roleError;

    const updatedRoster = roster.slice();
    updatedRoster[targetIndex] = {
      ...rosterEntry,
      claimed_user_id: createdUser.id,
      claimed_at: new Date().toISOString(),
    };

    const { error: saveRosterError } = await supabase
      .from("app_settings")
      .update({ value: updatedRoster, updated_at: new Date().toISOString() })
      .eq("key", "student_signup_roster");
    if (saveRosterError) throw saveRosterError;

    return jsonResponse({
      success: true,
      nome: rosterEntry.nome,
      turma_id: resolvedTurmaId,
      email: rosterEntry.email,
      login_identifier: loginIdentifier,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Erro inesperado no auto cadastro.";
    return jsonResponse({ error: message }, 500);
  }
});
