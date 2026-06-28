-- ============================================================
--  오더 삭제 시 worklist_log가 막던 문제 해결:
--  worklist_log.order_item_id 외래키를 ON DELETE CASCADE 로 재생성.
--  (재실행 안전)
-- ============================================================
ALTER TABLE worklist_log DROP CONSTRAINT IF EXISTS worklist_log_order_item_id_fkey;
ALTER TABLE worklist_log
  ADD CONSTRAINT worklist_log_order_item_id_fkey
  FOREIGN KEY (order_item_id) REFERENCES order_item(id) ON DELETE CASCADE;
