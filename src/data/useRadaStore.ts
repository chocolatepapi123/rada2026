import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { initialSpots, initialEvents, initialThrift } from './initialData';
import { RadaStore, SpotItem, EventItem, ThriftItem } from '../types';

const STORAGE_KEY = 'rada_app_persistent_store';

export function useRadaStore() {
  const [store, setStore] = useState<RadaStore>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { spots: initialSpots, events: initialEvents, thrift: initialThrift };
  });
  const [loading, setLoading] = useState(true);

  // 1. Load latest data from Supabase on launch
  useEffect(() => {
    async function syncWithSupabase() {
      try {
        const [spotsRes, eventsRes, thriftRes] = await Promise.all([
          supabase.from('spots').select('*').order('created_at', { ascending: false }),
          supabase.from('events').select('*').order('created_at', { ascending: false }),
          supabase.from('thrift_items').select('*').order('created_at', { ascending: false })
        ]);

        const updatedStore = {
          spots: spotsRes.data && spotsRes.data.length > 0 ? spotsRes.data : store.spots,
          events: eventsRes.data && eventsRes.data.length > 0 ? eventsRes.data : store.events,
          thrift: thriftRes.data && thriftRes.data.length > 0 ? thriftRes.data : store.thrift
        };

        setStore(updatedStore);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedStore));
      } catch (err) {
        console.warn('Offline mode active: Using cached local data', err);
      } finally {
        setLoading(false);
      }
    }

    syncWithSupabase();
  }, []);

  // 2. Action: Add Spot (Saves to state )
  const addSpot = async (newSpot: Omit<SpotItem, 'id'>) => {
  const payload = {
    title: newSpot.title?.trim() || 'Untitled Spot',
    category: newSpot.category?.trim() || 'General',
    neighborhood: newSpot.neighborhood?.trim() || 'Nairobi',
  };

  const { data, error } = await supabase
    .from('spots')
    .insert([payload])
    .select();

  if (error) {
    alert(`Supabase Error: ${error.message}`);
    console.error('Error inserting spot:', error);
    return;
  }

  alert('Successfully added spot to Supabase!');

  if (data && data.length > 0) {
    const updated = { ...store, spots: [data[0], ...store.spots] };
    setStore(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
};


  // 3. Action: Add Event (Saves to state + Supabase)
  const addEvent = async (newEvent: Omit<EventItem, 'id'>) => {
    const tempId = 'event_' + Date.now();
    const itemWithId = { ...newEvent, id: tempId };

    const updated = { ...store, events: [itemWithId, ...store.events] };
    setStore(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    await supabase.from('events').insert([newEvent]);
  };

  // 4. Action: Add Luku Thrift Item (Saves to state + Supabase)
  const addThriftItem = async (newItem: Omit<ThriftItem, 'id'>) => {
    const tempId = 'thrift_' + Date.now();
    const itemWithId = { ...newItem, id: tempId };

    const updated = { ...store, thrift: [itemWithId, ...store.thrift] };
    setStore(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

    await supabase.from('thrift_items').insert([newItem]);
  };

  return { store, loading, addSpot, addEvent, addThriftItem };
}

