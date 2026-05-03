import { useEffect, useRef } from 'react';
import { supabase } from '../../utils/supabase';
import { listenParkingChange, notifyParkingChange } from '../../utils/parkingSync';

const TABLES = [
  'vitrido',
  'lichsuxevao',
  'lichsuxera',
  'bangdatchotruoc',
  'thanhtiendatcho',
  'sudungdichvu',
] as const;

export const useParkingRealtimeSync = (onRefresh: () => void | Promise<void>) => {
  const refreshRef = useRef(onRefresh);

  useEffect(() => {
    refreshRef.current = onRefresh;
  }, [onRefresh]);

  useEffect(() => {
    const channel = supabase.channel('parking-realtime-bridge');

    TABLES.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          notifyParkingChange();
        }
      );
    });

    channel.subscribe();

    const off = listenParkingChange(() => {
      void refreshRef.current();
    });

    return () => {
      off();
      void supabase.removeChannel(channel);
    };
  }, []);
};