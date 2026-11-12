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

## Enrolment summary and profile rules

The enrolment preview shows which enrolment profile applied, how many eligible
records fell below the profile's `minimum_score`, how each reserved-place bucket
filled, and the household member each GROUP sort reads (for example
`head: household_pmt_score asc`). These come from the backend summary fields
`programmeProfile`, `belowMinimumScore` and `quotaFill`.

`ProgrammeProfileSummary` shows, read-only, the profile rules that apply to a
benefit plan and beneficiary status: the profile's eligibility criteria with
their subjects, its ranking (score items, minimum score, sort order, reserved
places and limit), and why the benefit plan's type cannot use the profile, if
it cannot. It uses the backend `enrolmentProgrammeProfile` query, which needs
the benefit plan read right. The enrolment form shows it with the mandatory
criteria (hidden with `show_mandatory_criteria_summary: false`), and it is
published as `enrolment.ProgrammeProfileSummary` with props `benefitPlanId`
(UUID or Relay ID) and `status`, for the Social Protection Phase page.

These need the backend Enrolment module with the summary fields and the
profile query (nlgfc2024/openimis-be-enrolment_py#11).
