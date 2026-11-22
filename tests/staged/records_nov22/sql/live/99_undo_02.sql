-- undo records_nov22 Phase B 02 (B3): puts back pb_safety.drop_open_on_close exactly as it was live (saved by the guard
-- in pb_stage.fn_backup). The 5 copied columns on pb_safety.permits are KEPT on purpose (dropping them would lose proof
-- already copied; nothing reads them yet, and r17.15 / r17.16 never write them).
-- Undo 03 first if it is in: with B9 in and this undone, the close-out drop is refused by the guard, logged in
-- pb_prod.pass_errors, and the open row stays (the close-out itself still succeeds, nothing breaks for the crew).
-- Plain SQL, DO-block safe. Running it twice is harmless (second run restores nothing).
do $u$ declare n integer; begin
  n := pb_stage.restore('records_b3');
  raise notice 'records undo 02: % function(s) restored', n;
end $u$;
