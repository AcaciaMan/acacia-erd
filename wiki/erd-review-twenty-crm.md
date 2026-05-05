# ERD Review — Twenty CRM (Entities, Phase 1)

**Declared positioning:** Physical · Prod · Relational

## Naming

The set is dominated by `camelCase` singular nouns, which is a coherent convention for a Physical/Relational model where entity names typically map 1:1 to table identifiers. A handful of names break that convention or carry baggage that's worth flagging.

> `[naming | error] Snake_case outliers among camelCase entities` — `typeorm_generated_columns_and_materialized_views` and `typeorm_migrations` are the only `snake_case` names in an otherwise uniformly `camelCase` set. Either rename to `typeormGeneratedColumnsAndMaterializedViews` / `typeormMigrations` for consistency, or — preferably — exclude framework-internal tables from the modelled ERD entirely (see Coverage).

> `[naming | warn] Vendor/framework prefix leaks into entity names` — `typeorm_*` names embed an ORM brand into the domain model. Even at Physical level this is unusual; these are infrastructure tables, not domain entities. Action: drop them or move them to a separate "infrastructure" sub-model.

> `[naming | warn] Ambiguous "Target" suffix` — `noteTarget`, `taskTarget`, `roleTarget` all use a `…Target` suffix that is jargon for "polymorphic association row." At Physical level it's defensible, but the suffix is opaque to readers. Action: keep the names but document the convention (e.g. "*Target = junction to a polymorphic owner") in the model's notes.

> `[naming | warn] "frontComponent" is ambiguous` — Reads as either "front-end UI component" or "component of the Front (front.com) integration." Given the presence of `messageChannel` and similar integration entities, disambiguate to `frontIntegrationComponent` or `uiFrontComponent`.

> `[naming | info] Long compound name` — `messageChannelMessageAssociationMessageFolder` is a 4-noun chain. Likely a junction between `messageChannelMessageAssociation` and `messageFolder`; the name is technically consistent but hard to read. Consider `mcMessageAssociationFolder` or splitting the relationship differently. Low priority.

> `[naming | info] Mixed singular nouns are consistent` — `person`, `company`, `task`, `note`, `view`, etc. are uniformly singular. Good. No pluralization inconsistency detected (the apparent "plurals" like `appToken`, `apiKey` are still singular nouns).

> `[naming | info] Acronym casing` — `apiKey`, `appToken`, `workspaceSSOIdentityProvider` mix lowercase and uppercase acronyms (`api` vs `SSO`). Pick one rule (`workspaceSsoIdentityProvider` or `aPIKey`) and apply uniformly. Cosmetic.

## Granularity

For a Physical/Relational model, fine-grained junction and metadata tables are expected, and most entities sit at a sensible row-per-thing grain. A few stand out.

> `[structure | warn] Variable tables look attribute-level` — `applicationVariable` and `applicationRegistrationVariable` resemble EAV/key-value bags rather than first-class entities. That's a legitimate Physical pattern, but flag whether they could collapse into JSON columns on `application` / `applicationRegistration` if the variable set is bounded.

> `[structure | info] keyValuePair as a generic entity` — A single `keyValuePair` table is a classic catch-all. At Physical level this is fine but worth confirming it isn't doing the job of several distinct settings/preferences entities that would be clearer if split.

> `[structure | info] Deeply nested agent conversation grain` — `agent → agentChatThread → agentTurn → agentMessage → agentMessagePart` plus `agentTurnEvaluation` is a five-level hierarchy. The grain looks intentional (parts within messages within turns), but verify `agentMessage` vs `agentMessagePart` aren't redundant — i.e., that multi-part messages actually exist in the domain.

> `[structure | info] Logic function split` — `logicFunction` + `logicFunctionLayer` is plausible (function + its layered definition), but at Physical level confirm `logicFunctionLayer` isn't really an attribute collection that belongs on `logicFunction`.

> `[structure | info] Row-level permission split is appropriate` — `rowLevelPermissionPredicate` + `rowLevelPermissionPredicateGroup` is a well-formed predicate-tree pattern; grain looks right.

## Missing or duplicate concepts

> `[completeness | warn] Workspace membership and user-workspace link both present` — `userWorkspace` and `workspaceMember` both appear. These are commonly the same concept (user ↔ workspace junction with membership metadata). Likely overlap; clarify the distinction (e.g. `userWorkspace` = identity link, `workspaceMember` = profile-in-workspace) or merge.

> `[completeness | warn] Token-like entities overlap` — `apiKey`, `appToken`, and `twoFactorAuthenticationMethod` are all credential-ish. `apiKey` vs `appToken` in particular can blur (both are bearer secrets bound to an app/user). Confirm they represent distinct lifecycles.

> `[completeness | warn] Domain entities overlap` — `emailingDomain`, `approvedAccessDomain`, and `publicDomain` all model "a domain string with a purpose flag." Consider whether one `domain` entity with a `purpose`/`type` discriminator would be cleaner, or document why three tables are warranted (different lifecycles, different owners).

> `[completeness | warn] View-related entities are dense; check duplication` — `view`, `viewField`, `viewFieldGroup`, `viewFilter`, `viewFilterGroup`, `viewGroup`, `viewSort`. The pair `viewField` / `viewFieldGroup` and `viewFilter` / `viewFilterGroup` follow a consistent pattern, but `viewGroup` (no qualifier) sits oddly alongside `viewFieldGroup`. Likely fine, but the naming risks confusion — is `viewGroup` "grouping of views" or "row grouping in a view"?

> `[completeness | warn] CRM core looks thin` — For "the #1 open-source CRM" you have `company`, `person`, `opportunity`, `note`, `task`, `attachment`, `timelineActivity`. Conspicuously absent at Physical level for a CRM: `lead`, `pipeline` / `pipelineStage` (opportunities usually live on a pipeline), `product` / `lineItem`, `contract`/`quote`, `campaign`. Either the CRM domain is intentionally minimal (Twenty leans on user-defined objects via `objectMetadata`) or these are missing. Worth confirming.

> `[completeness | info] Custom-object metadata is present` — `objectMetadata`, `fieldMetadata`, `indexMetadata`, `indexFieldMetadata`, `searchFieldMetadata`, `fieldPermission`, `objectPermission` collectively suggest a metadata-driven schema where business entities are user-defined. This explains the thin "hard-coded" CRM core and is internally consistent.

> `[completeness | warn] Audit/event entities sparse` — Only `timelineActivity` and `upgradeMigration` look event-like. No generic `auditLog` / `eventLog` / `changeLog` is visible. For a Prod Physical CRM with permissions and webhooks this is often present; flag as possibly missing or possibly handled outside the DB.

> `[completeness | info] Notifications absent` — No `notification`, `notificationPreference`, or `notificationDelivery`. May be handled by `messageChannel` + workflows, but worth a sanity check.

> `[completeness | info] Out-of-place entities` — `pet`, `petCareAgreement`, `rocket`, `surveyResult`, `employmentHistory`, `skill` look like demo / seed / sample data rather than core CRM entities. Confirm these are intentional (Twenty ships demo workspaces) and consider segregating them in the diagram so reviewers don't mistake them for the core domain.

## Coverage

> `[risk | warn] Mix of domain, metadata, and infrastructure tables in one diagram` — At Physical/Prod level it's legitimate to show every table, but the diagram currently mixes (a) CRM domain (`company`, `person`, `opportunity`), (b) platform metadata (`objectMetadata`, `fieldMetadata`, `view*`), (c) auth/permissions (`role`, `permissionFlag`, `userWorkspace`), (d) integrations (`messageChannel`, `calendarChannel`, `frontComponent`), (e) AI/agent (`agent*`), (f) workflow (`workflow*`), (g) framework internals (`typeorm_*`), and (h) demo data (`pet`, `rocket`). Without sub-grouping the picture is hard to read. Action: introduce subject areas/packages even if all entities remain in one model.

> `[completeness | info] Coverage feels comprehensive for a platform model` — Auth, permissions, metadata, views, workflows, AI agents, messaging, calendar, files, webhooks, and migrations are all represented. This does not look like a partial slice; if anything, it errs toward including too much (framework tables, demo data) for a single ERD.

> `[risk | info] No environment-specific markers` — Declared Environment is Prod, but nothing in the entity list looks Prod-only vs. Dev-only. That's expected — environment is usually orthogonal to schema — but worth confirming `featureFlag` and `postgresCredentials` aren't accidentally environment-coupled in a way the model should expose.

## Overall impression

This is a credible Physical/Relational snapshot of a metadata-driven CRM platform — the metadata, view, permission, and workflow subsystems are coherent and well-decomposed. The most actionable issues are convention drift (the `typeorm_*` snake_case intruders, demo entities like `pet`/`rocket` mixed with core domain) and a small cluster of likely overlaps to disambiguate (`userWorkspace` vs `workspaceMember`, the three domain entities, `apiKey` vs `appToken`). With ~90 entities spanning eight clearly different subject areas, the single biggest readability win would be grouping into subject areas before any further review of columns or relationships.