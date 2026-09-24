import { getSupabaseAdminClient, isSupabaseConfigured } from '../config/supabase';

const CONFIRMATION_WINDOW_MS = Number(process.env.DEVICE_CONFIRM_TIMEOUT_MS ?? 5 * 60 * 1000);

export interface ActiveSessionRow {
  id: string;
  user_id: string;
  device_id: string;
  device_label: string;
  token: string;
  status: 'active' | 'pending' | 'denied' | 'expired' | 'revoked';
  created_at: string;
  expires_at: string | null;
}

export type ResolveResult = 'approved' | 'denied' | 'expired' | 'not_found' | 'invalid_caller';

class DeviceSessionService {
  public async findActiveSession(userId: string): Promise<ActiveSessionRow | null> {
    if (!isSupabaseConfigured()) return null;
    const client = getSupabaseAdminClient();
    if (!client) return null;

    const { data, error } = await client
      .from('active_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Failed to look up active session:', error.message);
      return null;
    }

    return data ?? null;
  }

  // Verifies that `token` belongs to a currently-active session for `userId`.
  // Used to prove that whoever is calling the pending/resolve endpoints is the
  // already-logged-in device, not the (unauthenticated) device attempting the
  // new login.
  private async isCallerTheActiveDevice(userId: string, token: string): Promise<boolean> {
    if (!token) return false;
    const active = await this.findActiveSession(userId);
    return !!active && active.token === token;
  }

  // Inserts a new active session, or refreshes the existing one for the same
  // user+device instead of piling up a new row on every repeat login.
  public async createActiveSession(
    userId: string,
    deviceId: string,
    deviceLabel: string,
    token: string
  ): Promise<void> {
    if (!isSupabaseConfigured()) return;
    const client = getSupabaseAdminClient();
    if (!client) return;

    const { data: updated, error: updateError } = await client
      .from('active_sessions')
      .update({ token, device_label: deviceLabel, created_at: new Date().toISOString(), expires_at: null })
      .eq('user_id', userId)
      .eq('device_id', deviceId)
      .eq('status', 'active')
      .select('id');

    if (updateError) {
      console.error('Failed to refresh active session:', updateError.message);
      return;
    }

    if (updated && updated.length > 0) return;

    const { error: insertError } = await client.from('active_sessions').insert({
      user_id: userId,
      device_id: deviceId,
      device_label: deviceLabel,
      token,
      status: 'active',
    });

    if (insertError) {
      console.error('Failed to create active session:', insertError.message);
    }
  }

  public async createPendingSession(
    userId: string,
    deviceId: string,
    deviceLabel: string,
    token: string
  ): Promise<string | null> {
    if (!isSupabaseConfigured()) return null;
    const client = getSupabaseAdminClient();
    if (!client) return null;

    const expiresAt = new Date(Date.now() + CONFIRMATION_WINDOW_MS).toISOString();

    const { data, error } = await client
      .from('active_sessions')
      .insert({
        user_id: userId,
        device_id: deviceId,
        device_label: deviceLabel,
        token,
        status: 'pending',
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create pending session:', error.message);
      return null;
    }

    return data?.id ?? null;
  }

  // `callerToken` must belong to the user's currently-active session, so a
  // pending login's device_label/sessionId can't be read by anyone who just
  // knows the userId.
  public async getPendingForUser(
    userId: string,
    callerToken: string
  ): Promise<{ sessionId: string; deviceLabel: string } | null> {
    if (!isSupabaseConfigured()) return null;
    const client = getSupabaseAdminClient();
    if (!client) return null;

    if (!(await this.isCallerTheActiveDevice(userId, callerToken))) return null;

    const { data, error } = await client
      .from('active_sessions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Failed to look up pending session:', error.message);
      return null;
    }

    if (!data) return null;

    if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      await client.from('active_sessions').update({ status: 'expired' }).eq('id', data.id);
      return null;
    }

    return { sessionId: data.id, deviceLabel: data.device_label };
  }

  // `callerToken` must belong to the active session of the SAME user the
  // pending request targets — this is what stops the device attempting the
  // new login from approving its own request.
  public async resolvePending(sessionId: string, approve: boolean, callerToken: string): Promise<ResolveResult> {
    if (!isSupabaseConfigured()) return 'not_found';
    const client = getSupabaseAdminClient();
    if (!client) return 'not_found';

    const { data: pending, error: fetchError } = await client
      .from('active_sessions')
      .select('*')
      .eq('id', sessionId)
      .eq('status', 'pending')
      .maybeSingle();

    if (fetchError) {
      console.error('Failed to fetch pending session for resolution:', fetchError.message);
      return 'not_found';
    }

    if (!pending) return 'not_found';

    if (pending.expires_at && new Date(pending.expires_at).getTime() < Date.now()) {
      await client.from('active_sessions').update({ status: 'expired' }).eq('id', sessionId);
      return 'expired';
    }

    if (!(await this.isCallerTheActiveDevice(pending.user_id, callerToken))) {
      return 'invalid_caller';
    }

    if (approve) {
      await client
        .from('active_sessions')
        .update({ status: 'revoked' })
        .eq('user_id', pending.user_id)
        .eq('status', 'active');

      await client.from('active_sessions').update({ status: 'active' }).eq('id', sessionId);
      return 'approved';
    }

    await client.from('active_sessions').update({ status: 'denied' }).eq('id', sessionId);
    return 'denied';
  }

  public async getSessionStatus(sessionId: string): Promise<ActiveSessionRow['status'] | 'not_found'> {
    if (!isSupabaseConfigured()) return 'not_found';
    const client = getSupabaseAdminClient();
    if (!client) return 'not_found';

    const { data, error } = await client
      .from('active_sessions')
      .select('*')
      .eq('id', sessionId)
      .maybeSingle();

    if (error || !data) return 'not_found';

    if (data.status === 'pending' && data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
      await client.from('active_sessions').update({ status: 'expired' }).eq('id', sessionId);
      return 'expired';
    }

    return data.status;
  }

  // Marks the session for `token` as revoked so a fresh login from a
  // different device doesn't get stuck waiting for approval from a device
  // whose user already logged out.
  public async revokeByToken(token: string): Promise<void> {
    if (!isSupabaseConfigured() || !token) return;
    const client = getSupabaseAdminClient();
    if (!client) return;

    const { error } = await client
      .from('active_sessions')
      .update({ status: 'revoked' })
      .eq('token', token)
      .eq('status', 'active');

    if (error) {
      console.error('Failed to revoke session on logout:', error.message);
    }
  }
}

export const deviceSessionService = new DeviceSessionService();
