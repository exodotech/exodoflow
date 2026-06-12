SELECT 
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE') as total_tabelas,
  (SELECT COUNT(*) FROM pg_tables WHERE schemaname='public' AND rowsecurity=TRUE) as tabelas_com_rls,
  (SELECT COUNT(*) FROM clients) as clientes_seed,
  (SELECT COUNT(*) FROM bookings) as bookings_seed;