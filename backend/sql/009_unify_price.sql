-- ============================================================
--  가격 칼럼 통일: 실제 사용되던 값(price_clinic) 기준으로 price와 price_clinic을 일치시킴.
--  단일 가격 체계라 두 칼럼을 나눌 필요가 없어, 화면은 한 칸으로 합치고
--  데이터는 여기서 한 번 맞춤. (재실행 안전 / 가격 변동 없음)
--  price_clinic이 비어있던 코드는 기존 price 값을 사용.
-- ============================================================
UPDATE order_code
   SET price        = COALESCE(price_clinic, price),
       price_clinic = COALESCE(price_clinic, price);
