-- ============================================================
-- seed.sql — Hotel Morya Lodging STAGING/DEV seed
-- ============================================================
begin;

-- ---------- Hotel settings (single row) ----------
insert into hotel_settings (id, name, slug, address, city, state, phone, email,
                            check_in_time, check_out_time, advance_percent,
                            auto_cancel_hours_after_booking, min_hours_before_checkin)
values (
  '00000000-0000-0000-0000-0000000000a1',
  'Hotel Morya Lodging',
  'hotel-morya',
  'Near Shri Balumama Temple, Admapur',
  'Admapur',
  'Maharashtra',
  '7709995261',
  'hotelmoryaadmapur@gmail.com',
  '12:00:00', '11:00:00',
  0.00, 24, 6
)
on conflict (id) do update set
  name = excluded.name,
  slug = excluded.slug;

-- ---------- Room types (fixed UUIDs) ----------
insert into room_types (id, name, description, base_rate, day_use_rate, max_guests, amenities, sort_order)
values
  ('10000000-0000-0000-0000-000000000001',
   '{"en":"Non-AC Room","mr":"नॉन-एसी रूम","hi":"नॉन-एसी कमरा"}'::jsonb,
   '{"en":"Comfortable and restful room with attached bath and hot water.","mr":"संलग्न स्नानगृह आणि गरम पाण्यासह आरामदायक खोली.","hi":"संलग्न स्नानघर और गर्म पानी के साथ आरामदायक कमरा।"}'::jsonb,
   800.00, 300.00, 3, '["Fan","Attached Bath","Geyser"]'::jsonb, 1),
  ('10000000-0000-0000-0000-000000000002',
   '{"en":"AC Room","mr":"एसी रूम","hi":"एसी कमरा"}'::jsonb,
   '{"en":"Cool, air-conditioned room with TV and modern amenities.","mr":"टीव्ही आणि आधुनिक सुविधांसह वातानुकूलित खोली.","hi":"टीवी और आधुनिक सुविधाओं के साथ वातानुकूलित कमरा।"}'::jsonb,
   1500.00, 600.00, 3, '["AC","TV","WiFi","Geyser","Attached Bath"]'::jsonb, 2),
  ('10000000-0000-0000-0000-000000000003',
   '{"en":"Non-AC Dormitory","mr":"नॉन-एसी डॉर्मिटरी","hi":"नॉन-एसी डॉर्मिटरी"}'::jsonb,
   '{"en":"Spacious shared dormitory tailored for pilgrim families and large groups.","mr":"भाविक कुटुंब आणि मोठ्या गटांसाठी प्रशस्त डॉर्मिटरी.","hi":"श्रद्धालु परिवारों और बड़े समूहों के लिए विशाल डॉर्मिटरी।"}'::jsonb,
   2200.00, null, 10, '["Fan","Multiple Beds","Attached Bath","Geyser"]'::jsonb, 3)
on conflict (id) do nothing;

-- ---------- Rooms (physical) ----------
insert into rooms (id, room_type_id, room_number, floor, status)
values
  ('20000000-0000-0000-0000-000000000101', '10000000-0000-0000-0000-000000000001', '101', 0, 'available'),
  ('20000000-0000-0000-0000-000000000102', '10000000-0000-0000-0000-000000000001', '102', 0, 'available'),
  ('20000000-0000-0000-0000-000000000103', '10000000-0000-0000-0000-000000000001', '103', 0, 'available'),
  ('20000000-0000-0000-0000-000000000201', '10000000-0000-0000-0000-000000000002', '201', 1, 'available'),
  ('20000000-0000-0000-0000-000000000202', '10000000-0000-0000-0000-000000000002', '202', 1, 'available'),
  ('20000000-0000-0000-0000-000000000203', '10000000-0000-0000-0000-000000000002', '203', 1, 'available'),
  ('20000000-0000-0000-0000-000000000204', '10000000-0000-0000-0000-000000000002', '204', 1, 'available'),
  ('20000000-0000-0000-0000-000000000301', '10000000-0000-0000-0000-000000000003', '301', 2, 'available')
on conflict (room_number) do nothing;

-- ---------- Sample guests ----------
insert into guests (id, fullname, phone, email, city, preferred_language, tags)
values
  ('30000000-0000-0000-0000-000000000001', 'Ramesh Patil',   '9876500011', 'ramesh@example.com', 'Kolhapur', 'mr', '{"Frequent"}'),
  ('30000000-0000-0000-0000-000000000002', 'Sunita Deshmukh', '9876500022', null,                 'Sangli',   'mr', '{}'),
  ('30000000-0000-0000-0000-000000000003', 'Imran Shaikh',    '9876500033', 'imran@example.com',  'Pune',     'mr', '{"VIP"}')
on conflict (phone) do nothing;

commit;
