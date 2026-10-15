import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export function useUserProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }

    async function fetchProfile() {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching profile:', error);
      } else {
        setProfile(data);
      }
      
      setLoading(false);
    }

    fetchProfile();
  }, [userId]);

  return { profile, loading };
}
