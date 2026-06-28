-- ============================================================
--  영수 취소(void) 지원: billing 상태에 'cancelled' 추가 + 취소 기록 컬럼
--  기존 DB에 그대로 실행 가능 (재실행 안전).
-- ============================================================
ALTER TABLE billing DROP CONSTRAINT IF EXISTS billing_payment_status_check;
ALTER TABLE billing ADD CONSTRAINT billing_payment_status_check
  CHECK (payment_status IN ('waiting','paid','partial','unpaid','waived','cancelled'));

ALTER TABLE billing ADD COLUMN IF NOT EXISTS cancelled_at  TIMESTAMPTZ;
ALTER TABLE billing ADD COLUMN IF NOT EXISTS cancelled_by  INTEGER REFERENCES staff(id);
ALTER TABLE billing ADD COLUMN IF NOT EXISTS cancel_reason TEXT;
