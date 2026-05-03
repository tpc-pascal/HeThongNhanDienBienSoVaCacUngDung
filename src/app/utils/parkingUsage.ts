import { supabase } from './supabase';
import { normalizePlate } from './plateRules';

export const ensureParkingServiceUsedOnce = async (payload: {
  manguoidung: string;
  mabaido: string;
}) => {
  const { manguoidung, mabaido } = payload;
  if (!manguoidung || !mabaido) return { inserted: false, skipped: true };

  const { data, error } = await supabase
    .from('sudungdichvu')
    .select('id')
    .eq('manguoidung', manguoidung)
    .eq('mabaido', mabaido)
    .maybeSingle();

  if (error) throw error;
  if (data) return { inserted: false, skipped: true };

  const { error: insertError } = await supabase.from('sudungdichvu').insert({
    manguoidung,
    mabaido,
    dasudungdichvu: true,
  });

  if (insertError) throw insertError;
  return { inserted: true, skipped: false };
};

export const hasActivePlateInLot = async (payload: {
  plate: string;
  spotIds: string[];
}) => {
  const plate = normalizePlate(payload.plate);
  if (!plate || payload.spotIds.length === 0) return false;

  const { data, error } = await supabase
    .from('lichsuxevao')
    .select('maxevao')
    .eq('ketthuc', false)
    .eq('bienso', plate)
    .in('mavitri', payload.spotIds);

  if (error) throw error;
  return (data ?? []).length > 0;
};