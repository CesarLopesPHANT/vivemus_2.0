
import { supabase } from "../lib/supabase";
import { MedicalRecord, Appointment } from "../types";

export const getMedicalRecords = async (userId: string) => {
  const { data, error } = await supabase
    .from('medical_records')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  
  if (error) return [];
  return data;
};

export const saveMedicalRecord = async (record: Omit<MedicalRecord, 'id'>) => {
  const { data, error } = await supabase
    .from('medical_records')
    .insert([record])
    .select()
    .single();
  
  if (error) throw error;
  return data;
};
