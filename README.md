# openIMIS Enrolment frontend module

Owns the enrolment routes, screens, eligibility filters, preview and confirmation
actions, reducer state, translations, and navigation contributions. It reuses the
generic Individual and Household search components only to display registry data.

## Deployment and migration

- Register `EnrolmentModule` in the frontend hub `openimis.json` and deploy it
  together with Individual frontend #22, Social Protection frontend #13, and
  the backend Enrolment module. Social Protection #13 renders this module's
  nested `Social Protection → Enrolment` contribution.
- Instances that configure `fe-core.menus` may add `enrolment.menu` to the
  `BenefitPlanMainMenu.submenus` list to choose its position. Social Protection
  #13 keeps the new grouped entry visible when an older instance configuration
  has not yet added that optional ordering entry.
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

## Optional household district filter

Set `enable_household_district_filter: true` at the top level of the exposed
`fe-enrolment` module configuration to offer District (R) in household operator
filters. It defaults to false and is independent of the Phase beneficiary schema.
Also enable the same flag in backend `enrolment` configuration: the backend remains
authoritative and rejects district requests while disabled. No Phase schema or
Social Protection creation-default edits are needed. Saved district operator values
are omitted while the frontend flag is disabled; stale previews are invalidated.
