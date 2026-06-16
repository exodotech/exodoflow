-- =============================================================================
-- 0049 — ÍNDICES DE PERFORMANCE (tenant_id de RLS + FKs sem cobertura)
--
-- 1. ai_contexts não tinha índice em tenant_id → RLS (tenant_id = auth_tenant_id())
--    fazia seq scan. Crítico.
-- 2. ~30 chaves estrangeiras sem índice de cobertura → o Postgres não indexa FKs
--    automaticamente; sem índice, os JOINs por essa coluna e os ON DELETE
--    (CASCADE/SET NULL) fazem seq scan. É o que o advisor do Supabase sinaliza.
--
-- Todos IF NOT EXISTS (idempotente). Custo de escrita negligenciável nestas
-- tabelas; ganho real em leitura/cascade.
-- =============================================================================

-- ── 1. tenant_id em falta (RLS) ──────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_ai_contexts_tenant ON ai_contexts (tenant_id);

-- ── 2. FKs sem índice de cobertura ───────────────────────────────────────────
-- resources / recursos
CREATE INDEX IF NOT EXISTS idx_resources_profile          ON resources (profile_id);
CREATE INDEX IF NOT EXISTS idx_resource_blocks_created_by ON resource_blocks (created_by);

-- bookings (tabela quente). NOTA: já existem compostos (tenant_id, client_id, …)
-- e (tenant_id, service_id) — mas, como a FK só conta como indexada se a coluna
-- for a PRIMEIRA do índice, criam-se índices dedicados (nomes _fk p/ não colidir).
CREATE INDEX IF NOT EXISTS idx_bookings_client_fk     ON bookings (client_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_fk    ON bookings (service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_created_by    ON bookings (created_by);
CREATE INDEX IF NOT EXISTS idx_bookings_cancelled_by  ON bookings (cancelled_by);

-- whatsapp
CREATE INDEX IF NOT EXISTS idx_wa_conv_client      ON whatsapp_conversations (client_id);
CREATE INDEX IF NOT EXISTS idx_wa_conv_assigned    ON whatsapp_conversations (assigned_to);
CREATE INDEX IF NOT EXISTS idx_wa_msg_sent_by      ON whatsapp_messages (sent_by);

-- consentimentos / comunicação (idx_legal_consents_client já existe como composto)
CREATE INDEX IF NOT EXISTS idx_legal_consents_client_fk ON legal_consents (client_id);
CREATE INDEX IF NOT EXISTS idx_comm_logs_template       ON communication_logs (template_id);

-- equipa / auditoria de sistema
CREATE INDEX IF NOT EXISTS idx_team_invites_invited_by  ON team_invites (invited_by);
CREATE INDEX IF NOT EXISTS idx_team_invites_resource    ON team_invites (resource_id);
CREATE INDEX IF NOT EXISTS idx_sys_audit_actor          ON system_audit_logs (actor_profile_id);

-- finanças / pacotes
CREATE INDEX IF NOT EXISTS idx_fin_tx_client       ON financial_transactions (client_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_created_by   ON financial_transactions (created_by);
CREATE INDEX IF NOT EXISTS idx_client_pkg_created  ON client_packages (created_by);
CREATE INDEX IF NOT EXISTS idx_client_pkg_service  ON client_packages (service_id);

-- fichas / recibos
CREATE INDEX IF NOT EXISTS idx_treat_booking    ON treatment_records (booking_id);
CREATE INDEX IF NOT EXISTS idx_treat_service    ON treatment_records (service_id);
CREATE INDEX IF NOT EXISTS idx_treat_created_by ON treatment_records (created_by);
CREATE INDEX IF NOT EXISTS idx_receipts_created_by ON receipts (created_by);

-- lista de espera
CREATE INDEX IF NOT EXISTS idx_waitlist_client     ON waitlist (client_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_created_by ON waitlist (created_by);
CREATE INDEX IF NOT EXISTS idx_waitlist_resource   ON waitlist (resource_id);
CREATE INDEX IF NOT EXISTS idx_waitlist_service    ON waitlist (service_id);

-- avaliações / pedidos de titulares
CREATE INDEX IF NOT EXISTS idx_reviews_created_by    ON reviews (created_by);
CREATE INDEX IF NOT EXISTS idx_dsr_handled_by        ON data_subject_requests (handled_by);
CREATE INDEX IF NOT EXISTS idx_dsr_target_client     ON data_subject_requests (target_client_id);
CREATE INDEX IF NOT EXISTS idx_dsr_target_profile    ON data_subject_requests (target_profile_id);
