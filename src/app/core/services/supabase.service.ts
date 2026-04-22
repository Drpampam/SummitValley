import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  readonly client!: SupabaseClient;
  readonly isConfigured: boolean;

  constructor() {
    const url = environment.supabaseUrl?.trim();
    const key = environment.supabaseKey?.trim();
    this.isConfigured = !!(url && key);

    if (this.isConfigured) {
      (this as { client: SupabaseClient }).client = createClient(url, key);
    } else {
      console.warn('[SupabaseService] Supabase credentials missing — running in offline/mock mode.');
    }
  }
}
