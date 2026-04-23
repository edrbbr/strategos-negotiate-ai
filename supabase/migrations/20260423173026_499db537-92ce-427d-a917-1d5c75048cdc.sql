-- Unwrap JSON-encoded strategy strings in case_versions
UPDATE public.case_versions
SET strategy = (strategy::jsonb ->> 'strategy')
WHERE strategy LIKE '{"strategy":%'
  AND (strategy::jsonb ->> 'strategy') IS NOT NULL;

-- Unwrap JSON-encoded strategy strings in cases
UPDATE public.cases
SET strategy = (strategy::jsonb ->> 'strategy')
WHERE strategy LIKE '{"strategy":%'
  AND (strategy::jsonb ->> 'strategy') IS NOT NULL;