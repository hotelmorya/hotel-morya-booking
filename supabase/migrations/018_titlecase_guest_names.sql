-- 018_titlecase_guest_names
-- Guest names are always stored title-cased ("rajesh kumar" -> "Rajesh Kumar").

-- 1) Backfill existing rows.
UPDATE public.guests
SET fullname = pg_catalog.initcap(fullname)
WHERE fullname IS NOT NULL
  AND fullname <> pg_catalog.initcap(fullname);

-- 2) Enforce on every future write at the DB level (source of truth; CLAUDE.md §28).
CREATE OR REPLACE FUNCTION public.titlecase_guest_fullname()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF NEW.fullname IS NOT NULL THEN
    NEW.fullname := pg_catalog.initcap(NEW.fullname);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guests_titlecase_fullname ON public.guests;
CREATE TRIGGER guests_titlecase_fullname
  BEFORE INSERT OR UPDATE OF fullname ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.titlecase_guest_fullname();
