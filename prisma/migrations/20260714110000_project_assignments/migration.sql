-- Projects module fixes: the "client" field was already read/written by the
-- controller and shown on every Projects-page card/table/detail view, but
-- had no backing column (silently dropped on every save). Adding it so it
-- actually persists.
--
-- This migration doesn't touch ProjectMember — that table already exists
-- and already supports what we need (real employee assignment + soft
-- delete) for the new "unassigned project" / "accept project" workflow;
-- no schema change needed there, only new application logic.

ALTER TABLE "projects" ADD COLUMN "client" TEXT;
