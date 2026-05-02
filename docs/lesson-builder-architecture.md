# ESL Hub Lesson Builder (Next-Generation) Architecture Spec

## Goals and constraints
- Enable teachers to build full lessons from ordered blocks.
- Preserve current prompt-based lesson mode without behavior regressions.
- Use incremental adoption with minimal UI disruption.
- Persist canonical lesson content in `lesson_blocks` JSONB.

## Proposed data model

### Persistence target
Add block storage fields to the `prompts` table (existing `assignment_type = 'lesson'` rows):

- `lesson_blocks jsonb not null default '{"schemaVersion":2,"blocks":[]}'::jsonb`
- `lesson_schema_version int not null default 2`
- `lesson_migrated_from_legacy boolean not null default false`

Recommended constraints/indexes:
- Check `jsonb_typeof(lesson_blocks) = 'object'`
- Check `lesson_blocks ? 'blocks'`
- GIN index for future analytics/querying on block kinds

### TypeScript contract
`src/types/lessonBlocks.ts` defines:
- `LessonBlock` discriminated union for all requested block categories
- `LessonBlocksPayload` root payload with `schemaVersion`
- `migrateLegacyLessonToBlocks` adapter for older prompt-style lessons

## Supported block types (v2 schema)
1. `source`
   - supports `video_url`, `audio_url`, `image`, `text`, `pdf_link`
2. `vocabulary`
   - supports `matching_pairs`, `word_definition`, `word_image`, `sentence_meaning`
3. `multiple_choice`
4. `grammar_explanation`
5. `speaking_task`
   - includes `suggestedTimeSec`, optional context references, `aiFeedbackEnabled`
6. `writing_task`
7. `final_quiz`
   - mixed question support + score summary toggle

## Block rendering strategy

Use registry-based rendering rather than switch-heavy components:

- `LessonBlockRendererRegistry: Record<LessonBlockKind, React.FC<Props>>`
- Teacher preview and student runtime share block renderer primitives.
- Category-specific UI lives in focused components per block kind.
- Unknown or unsupported block kinds render a guarded fallback card.

Why now:
- Adds new block kinds without touching core player layout.
- Keeps "current lesson mode" stable by routing old records through adapters.

## Teacher builder strategy

Phase into existing dashboard/prompt editor with low-risk steps:

1. Keep current assignment creation entry points.
2. Add "Lesson (Blocks)" mode under `assignment_type = 'lesson'`.
3. Builder UX primitives:
   - ordered block list
   - add block menu by category
   - block editor drawer/panel
   - reorder controls (drag later; up/down first)
4. Save as single `lesson_blocks` payload.
5. Draft validation on save:
   - required fields per block type
   - stable block ids
   - ordering continuity

## Student completion strategy

Runtime flow:
- Load lesson assignment.
- If `lesson_blocks` exists, render blocks in order.
- If not, convert legacy fields with `migrateLegacyLessonToBlocks`.
- Track per-block completion local state first, then persist summary.

Completion model (initial):
- `source`, `grammar_explanation`: viewed/acknowledged
- `vocabulary`, `multiple_choice`, `final_quiz`: answer state + correctness
- `speaking_task`, `writing_task`: submission reference + feedback state

Keep submission pipeline compatibility by mapping speaking/writing block outputs to existing submission table patterns where possible.

## Backward compatibility strategy

1. No destructive migration of old rows.
2. Resolver order at runtime:
   - Use `lesson_blocks` when present and non-empty.
   - Else synthesize v2 payload from legacy prompt fields.
3. Legacy write path remains available until full builder rollout.
4. Add telemetry flag to detect how often adapter path is used.

## What can be implemented immediately

- Add TS schema (`LessonBlock` union) and migration helper.
- Add DB migration for `lesson_blocks` JSONB + schema version fields.
- Add runtime adapter in lesson-loading path.
- Add read-only renderer shell for new block payloads.
- Add feature flag to keep existing lesson mode default.

## What should wait

- Full drag-and-drop reordering.
- Rich authoring UX for all block subtypes.
- AI feedback orchestration across speaking/writing/final quiz.
- Fine-grained analytics dashboards on block-level outcomes.
- Auto-generated quiz scoring explanations.

## Risks

- JSON schema drift between frontend and backend validators.
- Legacy migration edge cases (missing/null prompt fields).
- Overloading existing submission tables with heterogeneous block outputs.
- Large lesson payload performance in client state.
- Teacher confusion during dual-mode transition.

## Files that would need changes (planned)

Already added now:
- `src/types/lessonBlocks.ts`
- `docs/lesson-builder-architecture.md`

Likely next (not implemented yet):
- `src/components/TeacherDashboard.tsx` (entry mode + builder launch)
- `src/components/StudentView.tsx` (lesson payload resolver + runtime)
- `src/components/TeacherDashboardTypes.ts` (DB row typing for `lesson_blocks`)
- `supabase/migrations/*` new migration for JSONB fields and constraints
- Optional: new `src/components/lesson-builder/*` and `src/components/lesson-runtime/*`
