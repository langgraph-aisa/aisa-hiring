CREATE OR REPLACE FUNCTION process_public_application(payload jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  position_row record;
  candidate_id integer;
  application_id integer;
BEGIN
  SELECT p.id, f.id AS form_id INTO position_row
  FROM job_positions p
  JOIN application_forms f ON f.job_position_id = p.id AND f.published = true
  WHERE p.public_slug = payload->>'token' AND p.published = true
  LIMIT 1;

  IF position_row.id IS NULL THEN
    RAISE EXCEPTION 'La plaza no está publicada o ya no está disponible';
  END IF;

  SELECT c.id INTO candidate_id FROM candidates c WHERE c.phone_international = payload->>'phone' LIMIT 1;
  IF candidate_id IS NULL THEN
    INSERT INTO candidates (phone_international, phone_country, full_name, email)
    VALUES (payload->>'phone', COALESCE(payload->>'country','GT'), payload->>'fullName', NULLIF(payload->>'email',''))
    RETURNING id INTO candidate_id;
  ELSE
    UPDATE candidates SET full_name = payload->>'fullName', email = NULLIF(payload->>'email',''), updated_at = now() WHERE id = candidate_id;
  END IF;

  SELECT a.id INTO application_id FROM applications a WHERE a.candidate_id = candidate_id AND a.job_position_id = position_row.id LIMIT 1;
  IF application_id IS NOT NULL THEN
    RETURN jsonb_build_object('alreadyApplied', true, 'applicationId', application_id, 'message', 'Esta solicitud ya fue enviada previamente para esta plaza.');
  END IF;

  INSERT INTO applications (candidate_id, job_position_id, form_id, status)
  VALUES (candidate_id, position_row.id, position_row.form_id, 'en_revision')
  RETURNING id INTO application_id;

  INSERT INTO application_answers (application_id, question_id, value_json, normalized_value)
  SELECT application_id, q.id, answer.value, answer.value #>> '{}'
  FROM form_questions q
  JOIN LATERAL jsonb_each(payload->'answers') answer ON answer.key = q.field_key
  WHERE q.form_id = position_row.form_id AND q.active = true;

  RETURN jsonb_build_object('alreadyApplied', false, 'applicationId', application_id, 'positionId', position_row.id, 'phoneInternational', payload->>'phone');
END;
$$;

CREATE OR REPLACE FUNCTION finalize_application_evaluation(app_id integer, evaluation jsonb)
RETURNS jsonb
LANGUAGE plpgsql
AS $$
DECLARE
  normalized_status application_status;
BEGIN
  normalized_status := CASE evaluation->>'status'
    WHEN 'calificado' THEN 'calificado'::application_status
    WHEN 'no_calificado' THEN 'no_calificado'::application_status
    WHEN 'pendiente_revision_humana' THEN 'pendiente_revision_humana'::application_status
    ELSE 'error_procesamiento'::application_status
  END;

  INSERT INTO evaluations (application_id, status, reason, profile_summary, rule_results, ai_payload, ai_model)
  VALUES (app_id, normalized_status::text::evaluation_status, COALESCE(evaluation->>'reason','Sin motivo'), COALESCE(evaluation->>'profileSummary','Sin resumen'), COALESCE(evaluation->'ruleResults','[]'::jsonb), evaluation, evaluation->>'aiModel');

  UPDATE application_answers aa
  SET deterministic_result = rules.result
  FROM jsonb_to_recordset(COALESCE(evaluation->'ruleResults','[]'::jsonb)) AS rules(question_id integer, result varchar)
  WHERE aa.application_id = app_id AND aa.question_id = rules.question_id;

  UPDATE applications
  SET status = normalized_status,
      evaluation_at = now(),
      evaluation_reason = COALESCE(evaluation->>'reason','Sin motivo'),
      profile_summary = COALESCE(evaluation->>'profileSummary','Sin resumen'),
      updated_at = now()
  WHERE id = app_id;

  RETURN jsonb_build_object('applicationId', app_id, 'status', normalized_status, 'reason', evaluation->>'reason', 'profileSummary', evaluation->>'profileSummary');
END;
$$;

CREATE OR REPLACE FUNCTION audit_application_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO audit_log (entity_type, entity_id, action, before_json, after_json, comment)
    VALUES ('application', NEW.id, 'status_changed', to_jsonb(OLD), to_jsonb(NEW), 'Cambio registrado por trigger de PostgreSQL');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS applications_status_audit_trigger ON applications;
CREATE TRIGGER applications_status_audit_trigger
AFTER UPDATE OF status ON applications
FOR EACH ROW EXECUTE FUNCTION audit_application_status_change();
