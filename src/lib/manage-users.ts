import { supabase } from "@/integrations/supabase/client";

type UserRole = "admin" | "professor" | "coordenadora" | "aluno";

export type ManagedCredential = {
  user_id: string;
  nome: string;
  email: string;
  turma_id: string | null;
  login_identifier?: string;
  password: string;
};

type ManageUsersAction =
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

async function invokeManageUsers<T>(payload: ManageUsersAction): Promise<T> {
  const { data, error } = await supabase.functions.invoke("manage-users", {
    body: payload,
  });

  if (error) {
    throw new Error(error.message || "Erro ao acessar a funcao de usuarios.");
  }

  if (data?.error) {
    throw new Error(data.error);
  }

  return data as T;
}

export type ManagedUser = {
  user_id: string;
  nome: string;
  email: string;
  turma_id: string | null;
  avatar_url: string | null;
  role: UserRole;
  created_at: string;
};

export function createManagedUser(input: {
  nome: string;
  email: string;
  password: string;
  turma_id: string;
  role?: UserRole;
  turma_ids?: string[];
  assignments?: Array<{ turma_id: string; disciplina_id: string }>;
}) {
  return invokeManageUsers<{
    success: true;
    user_id: string;
    credential: ManagedCredential;
  }>({
    action: "create_user",
    ...input,
  });
}

export function batchCreateManagedUsers(users: Array<{ nome: string; email: string; turma_id: string; password?: string }>) {
  return invokeManageUsers<{
    success: number;
    errors: string[];
    credentials: ManagedCredential[];
  }>({
    action: "batch_create",
    users,
  });
}

export function listManagedUsers() {
  return invokeManageUsers<ManagedUser[]>({
    action: "list_users",
  });
}

export function resetManagedUserPassword(userId: string, newPassword?: string) {
  return invokeManageUsers<{
    success: true;
    password: string;
  }>({
    action: "reset_password",
    user_id: userId,
    new_password: newPassword,
  });
}

export function resetManagedUserProgress(userId: string, adminSecret: string) {
  return invokeManageUsers<{ success: true }>({
    action: "reset_progress",
    user_id: userId,
    admin_secret: adminSecret,
  });
}

export function deleteManagedUser(userId: string, adminSecret: string) {
  return invokeManageUsers<{ success: true }>({
    action: "delete_user",
    user_id: userId,
    admin_secret: adminSecret,
  });
}
