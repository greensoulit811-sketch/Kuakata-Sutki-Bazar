import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Direct API call to Steadfast from client
 * This bypasses the Edge Function and tests if client-side access works
 */
export const useCreateCourierParcelDirect = () => {
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
        // Get Steadfast settings from Supabase
        const { data: settings, error: settingsError } = await supabase
          .from('courier_settings')
          .select('*')
          .eq('provider', 'steadfast')
          .maybeSingle();

        if (settingsError || !settings) {
          throw new Error('Could not load Steadfast settings');
        }

        if (!settings.enabled) {
          throw new Error('Steadfast is not enabled');
        }

        if (!settings.api_base_url || !settings.api_key || !settings.api_secret) {
          throw new Error('Steadfast API credentials are missing');
        }

        const apiPayload = {
          invoice: payload.invoice,
          recipient_name: payload.recipient_name,
          recipient_phone: payload.recipient_phone,
          recipient_address: payload.recipient_address,
          cod_amount: payload.cod_amount,
          note: payload.note || '',
        };

        let baseUrl = settings.api_base_url;
        if (baseUrl && baseUrl.includes('portal.steadfast.com.bd')) {
          baseUrl = baseUrl.replace('portal.steadfast.com.bd', 'portal.packzy.com');
        }

        console.log('[CLIENT] Calling Steadfast API directly from client...');
        console.log('[CLIENT] URL:', baseUrl);

        const response = await fetch(`${baseUrl}/create_order`, {
          method: 'POST',
          headers: {
            'Api-Key': settings.api_key,
            'Secret-Key': settings.api_secret,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(apiPayload),
        });

        const resText = await response.text();
        console.log('[CLIENT] Response status:', response.status);
        console.log('[CLIENT] Response:', resText);

        let data: any;
        try {
          data = JSON.parse(resText);
        } catch {
          throw new Error(`Invalid response: ${resText.substring(0, 200)}`);
        }

        if (response.ok && data?.status === 200) {
          // Update order in Supabase
          await supabase.from('orders').update({
            status: 'shipped',
            courier_provider: 'steadfast',
            courier_status: 'created',
            courier_tracking_id: data.consignment?.tracking_code,
            courier_consignment_id: data.consignment?.consignment_id?.toString(),
            courier_updated_at: new Date().toISOString(),
          }).eq('id', payload.order_id);

          return {
            success: true,
            tracking_code: data.consignment?.tracking_code,
            consignment_id: data.consignment?.consignment_id,
          };
        }

        throw new Error(data?.message || 'Failed to create parcel');
      } catch (err: any) {
        console.error('[CLIENT] Error:', err);
        throw err;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] });
      toast.success('Parcel created successfully (Direct)');
    },
    onError: (error) => {
      toast.error('Direct API failed: ' + error.message);
    },
  });
};
