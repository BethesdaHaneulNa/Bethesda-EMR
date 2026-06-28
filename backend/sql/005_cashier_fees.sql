-- ============================================================
--  수납처에서 추가하는 발급/행정 비용 항목 (code_type='fee')
--  진료비(C01~C04)와 구분되는, 수납에서 직접 더하는 항목들.
--  이미 있으면 건너뜀(재실행 안전). 설정 > Order Codes 에서 더 추가/수정 가능.
-- ============================================================
INSERT INTO order_code (code,name,name_en,code_type,group_name,price,price_clinic,worklist_enabled,is_active)
SELECT 'DOC','Document Fee','Document Fee','fee','Issuance',5000,5000,false,true
WHERE NOT EXISTS (SELECT 1 FROM order_code WHERE code='DOC');
INSERT INTO order_code (code,name,name_en,code_type,group_name,price,price_clinic,worklist_enabled,is_active)
SELECT 'CDR','CD Copy','CD Copy','fee','Issuance',10000,10000,false,true
WHERE NOT EXISTS (SELECT 1 FROM order_code WHERE code='CDR');
INSERT INTO order_code (code,name,name_en,code_type,group_name,price,price_clinic,worklist_enabled,is_active)
SELECT 'CERT','Medical Certificate','Medical Certificate','fee','Issuance',8000,8000,false,true
WHERE NOT EXISTS (SELECT 1 FROM order_code WHERE code='CERT');
