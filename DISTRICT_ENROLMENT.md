# Household district enrolment

Ports nlgfc2024/openimis-fe-individual_js#26 into the extracted Enrolment UI, including its later three-card summary. The shared EnrollmentCriteriaForm remains the owner of preview and confirmation state for both individuals and groups.

The phase schema exposes the optional `district_id` integer field. Selecting it fixes the operator to Equals and uses the published Location picker at level 0 (R). Numeric and Relay location IDs serialize to positive numeric database IDs; empty selection is omitted. Saved values restore their labels. Core PR nlgfc2024/openimis-fe-core_js#26 supplies the shared district and Equals labels.

Household summary cards show verified unenrolled households, the stored phase target, and already-enrolled households. Zero targets remain zero; null targets show Not configured. Existing ranking/selection and membership guidance remain available. Individual summary behaviour is unchanged.

Register EnrolmentModule alongside the extracted Individual and Social Protection modules. Move `enrollment_ui` configuration into Enrolment and language overrides to the `enrolment` namespace. Compatibility route/reference aliases do not copy old module configuration. Deploy backend support for the three new GraphQL fields before this frontend.

## Validation

`npm test` covers utility contracts, picker interaction, the shared form's late/failed/repeated preview responses and phase/status changes, and the household summary. `npm run build` builds both Vite library formats. Components mock published host APIs; actual location-picker/browser integration remains a staging acceptance gate.
