# openIMIS Enrolment frontend module

Owns the enrolment routes, screens, eligibility filters, preview and confirmation
actions, reducer state, translations, and navigation contributions. It reuses the
generic Individual and Household search components only to display registry data.

## Deployment and migration

- Register `EnrolmentModule` in the frontend hub `openimis.json` and deploy it
  together with Individual frontend #22 and the backend Enrolment module.
- Move deployment overrides from `individual.enrollment.*` to `enrolment.*`.
  Malawi-specific terms such as Phase, Programme and Household belong in the
  coremis language pack; this package intentionally provides neutral defaults.
- Move `enrollment_ui` configuration to the Enrolment module. It is published as
  `enrolment.enrollmentUiConfig`; the former `individual.enrollmentUiConfig`
  reference remains as a temporary compatibility alias, so existing settings
  continue to work during the coordinated rollout.
- `/individuals/enrollment`, `/groups/enrollment`, and the former Individual
  route references remain protected compatibility aliases. Remove them only
  after bookmarks and dependent modules have migrated to `/enrolment/individuals`
  and `/enrolment/groups`.
