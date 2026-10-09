-- Pin search_path on all app functions (Supabase security advisor lint 0011).
-- Applied to the live project on 2026-06-10 as `harden_function_search_path`.
alter function public.set_updated_at()                    set search_path = public;
alter function public.recalc_advance_paid()               set search_path = public;
alter function public.guard_booking_status_transition()   set search_path = public;
alter function public.guard_payment_status_transition()   set search_path = public;
alter function public.log_booking_activity()              set search_path = public;
alter function public.log_payment_activity()              set search_path = public;
alter function public.log_room_activity()                 set search_path = public;
alter function public.recalc_guest_stats()                set search_path = public;
alter function public.current_user_role()                 set search_path = public;
