import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CaseAttachment {
  id: string;
  case_id: string;
  user_id: string;
  file_path: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  extracted_text: string | null;
  created_at: string;
}

export function useCaseAttachments(caseId: string | undefined) {
  return useQuery({
    queryKey: ["case_attachments", caseId],
    enabled: !!caseId && caseId !== "new",
    queryFn: async (): Promise<CaseAttachment[]> => {
      const { data, error } = await supabase
        .from("case_attachments")
        .select("*")
        .eq("case_id", caseId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as CaseAttachment[];
    },
  });
}

export function useUploadAttachment() {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { caseId: string; file: File }): Promise<CaseAttachment> => {
      if (!user) throw new Error("Not authenticated");
      const { caseId, file } = params;
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${caseId}/${Date.now()}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("case-attachments")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { data, error } = await supabase
        .from("case_attachments")
        .insert({
          case_id: caseId,
          user_id: user.id,
          file_path: path,
          file_name: file.name,
          mime_type: file.type || null,
          size_bytes: file.size,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as CaseAttachment;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["case_attachments", data.case_id] });
    },
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (att: CaseAttachment) => {
      await supabase.storage.from("case-attachments").remove([att.file_path]);
      const { error } = await supabase.from("case_attachments").delete().eq("id", att.id);
      if (error) throw error;
      return att;
    },
    onSuccess: (att) => {
      qc.invalidateQueries({ queryKey: ["case_attachments", att.case_id] });
    },
  });
}