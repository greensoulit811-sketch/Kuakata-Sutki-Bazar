import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface CourierSettings {
  id: string;
  provider: string;
  enabled: boolean;
  api_base_url: string | null;
  api_key: string | null;
  api_secret: string | null;
  merchant_id: string | null;
  pickup_address: string | null;
  pickup_phone: string | null;
  default_weight: number;
  cod_enabled: boolean;
  show_tracking_to_customer: boolean;
  created_at: string;
  updated_at: string;
}

// Check if using proxy backend
const USE_PROXY = import.meta.env.VITE_USE_STEADFAST_PROXY === 'true';
const PROXY_URL = import.meta.env.VITE_STEADFAST_PROXY_URL || 'http://localhost:3001';

console.log(`[CONFIG] Using Steadfast: ${USE_PROXY ? 'PROXY' : 'EDGE_FUNCTION'}`);

export const useCourierSettings = (provider: string) => {
  return useQuery({
    queryKey: ['courier_settings', provider],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('courier_settings')
        .select('*')
        .eq('provider', provider)
        .maybeSingle();
      
      if (error) throw error;
      return data as CourierSettings | null;
    },
  });
};

export const useSaveCourierSettings = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (settings: Partial<CourierSettings> & { provider: string }) => {
      const { data: existing } = await supabase
        .from('courier_settings')
        .select('id')
        .eq('provider', settings.provider)
        .maybeSingle();

      if (existing) {
        const { data, error } = await supabase
          .from('courier_settings')
          .update(settings)
          .eq('provider', settings.provider)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from('courier_settings')
          .insert(settings)
          .select()
          .single();
        
        if (error) throw error;
        return data;
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['courier_settings', variables.provider] });
      toast.success('Courier settings saved');
    },
    onError: (error) => {
      toast.error('Failed to save settings: ' + error.message);
    },
  });
};

export const useTestCourierConnection = () => {
  return useMutation({
    mutationFn: async (provider: string) => {
      try {
        if (USE_PROXY) {
          try {
            console.log('[TEST] Using proxy to test connection...');
            const response = await fetch(`${PROXY_URL}/api/steadfast/test`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            const data = await response.json();
            if (!data.success) throw new Error(data.error);
            return data;
          } catch (e: any) {
            console.warn('[PROXY] Proxy failed, falling back to Edge Function:', e.message);
          }
        }

        // Edge Function approach
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error('Session expired. Please login again.');
        }

        console.log('[TEST] Using Edge Function to test connection...');
        
        const response = await supabase.functions.invoke('steadfast-courier', {
          body: { action: 'test-connection' },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        console.log('[DEBUG] Test connection response:', response);

        if (response.error) {
          console.error('[DEBUG] Test connection error:', response.error);
          throw new Error(`Edge Function Error: ${response.error.message}`);
        }
        
        return response.data;
      } catch (err: any) {
        console.error('[DEBUG] Test connection catch error:', err);
        throw err;
      }
    },
    onError: (error) => {
      toast.error('Connection test failed: ' + error.message);
    },
    onSuccess: (data) => {
      toast.success(`Connected! Balance: ${data.balance}`);
    },
  });
};

export const useCreateCourierParcel = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: {
      order_id: string;
      recipient_name: string;
      recipient_phone: string;
      recipient_address: string;
      recipient_city: string;
      cod_amount: number;
      invoice: string;
      note?: string;
    }) => {
      try {
        if (USE_PROXY) {
          try {
            console.log('[PROXY] Creating parcel using proxy...');
            const response = await fetch(`${PROXY_URL}/api/steadfast/create-parcel`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                invoice: payload.invoice,
                recipient_name: payload.recipient_name,
                recipient_phone: payload.recipient_phone,
                recipient_address: payload.recipient_address,
                cod_amount: payload.cod_amount,
                note: payload.note,
              }),
            });
  
            const data = await response.json();
            console.log('[PROXY] Response:', data);
            
            if (!data.success) throw new Error(data.error);
  
            // Update order in Supabase
            await supabase.from('orders').update({
              status: 'shipped',
              courier_provider: 'steadfast',
              courier_status: 'created',
              courier_tracking_id: data.tracking_code,
              courier_consignment_id: data.consignment_id?.toString(),
              courier_updated_at: new Date().toISOString(),
            }).eq('id', payload.order_id);
  
            return data;
          } catch (e: any) {
            console.warn('[PROXY] Proxy failed, falling back to Edge Function:', e.message);
          }
        }

        // Edge Function approach
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error('Session expired. Please login again.');
        }
        
        console.log('[DEBUG] Creating parcel with payload:', { ...payload, action: 'create-parcel' });
        
        const response = await supabase.functions.invoke('steadfast-courier', {
          body: { ...payload, action: 'create-parcel' },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        console.log('[DEBUG] Function response:', response);

        if (response.error) {
          console.error('[DEBUG] Function error:', response.error);
          throw new Error(`Edge Function Error: ${response.error.message}`);
        }

        if (!response.data?.success) {
          const errorMsg = response.data?.error || 'Failed to create parcel';
          console.error('[DEBUG] Parcel creation failed:', errorMsg);
          throw new Error(errorMsg);
        }

        console.log('[DEBUG] Parcel created successfully:', response.data);
        return response.data;
      } catch (err: any) {
        console.error('[DEBUG] Mutation function error:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Parcel created successfully');
    },
    onError: (error) => {
      toast.error('Failed to create parcel: ' + error.message);
    },
  });
};

export const useTrackCourierStatus = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (payload: { consignment_id: string; order_id: string }) => {
      try {
        if (USE_PROXY) {
          try {
            console.log('[PROXY] Tracking status using proxy...');
            const response = await fetch(`${PROXY_URL}/api/steadfast/track`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ consignment_id: payload.consignment_id }),
            });
  
            const data = await response.json();
            console.log('[PROXY] Track response:', data);
            
            if (!data.success) throw new Error(data.error);
  
            // Update order
            if (data.delivery_status) {
              let courierStatus = 'created';
              let mainOrderStatus = null;
              const ds = data.delivery_status.toLowerCase();
  
              if (ds === 'delivered') {
                courierStatus = 'delivered';
                mainOrderStatus = 'delivered';
              } else if (ds === 'cancelled' || ds === 'returned') {
                courierStatus = 'cancelled';
                mainOrderStatus = 'cancelled';
              } else if (ds === 'pending') {
                courierStatus = 'pending';
              } else if (ds) {
                courierStatus = 'in_transit';
                mainOrderStatus = 'shipped';
              }
  
              const updateData: any = { 
                courier_status: courierStatus, 
                courier_updated_at: new Date().toISOString() 
              };
              if (mainOrderStatus) {
                updateData.status = mainOrderStatus;
              }
  
              await supabase.from('orders').update(updateData).eq('id', payload.order_id);
            }
  
            return data;
          } catch (e: any) {
            console.warn('[PROXY] Proxy failed, falling back to Edge Function:', e.message);
          }
        }

        // Edge Function approach
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.access_token) {
          throw new Error('Session expired. Please login again.');
        }

        console.log('[DEBUG] Tracking status for:', payload);
        
        const response = await supabase.functions.invoke('steadfast-courier', {
          body: { ...payload, action: 'track-status' },
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        console.log('[DEBUG] Track status response:', response);

        if (response.error) {
          console.error('[DEBUG] Track status error:', response.error);
          throw new Error(`Edge Function Error: ${response.error.message}`);
        }

        if (!response.data?.success) {
          const errorMsg = response.data?.error || 'Failed to track status';
          console.error('[DEBUG] Track status failed:', errorMsg);
          throw new Error(errorMsg);
        }

        console.log('[DEBUG] Status tracked successfully:', response.data);
        return response.data;
      } catch (err: any) {
        console.error('[DEBUG] Track status catch error:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Tracking status updated');
    },
    onError: (error) => {
      toast.error('Failed to track status: ' + error.message);
    },
  });
};
