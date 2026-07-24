# Sprint: Tri-Force v2 — Final (23-24 Jul 2026)

## What shipped

### Pipeline

- **DB Layer**: Module visibility API probes (visible flag per cmid)
- **UI Layer**: Switch-role student scan, visibility phantom detection (admin vs student view), auto-completion skip
- **API Layer**: Availability JSON breakdown, condition-referenced cmid cross-reference, section-level condition parsing
- **Report**: 3-layer structure (BLOQUEA/PRECAUCIÓN/INFO), nelthor verification summary, glossary for NO-IT
- **Data flow tests**: Unit tests for apiModuleData, nelthorData, visibility phantom logic

### The real blocker (course 269, Python 1)

- **cmid 6918** ("Notebook Funcion-Lambda", duplicate file `03.2-Funcion-Lambda-CEF (1).ipynb`): Only resource required for progression that's invisible to students
- Same content as cmid 6917 ("Notebook Funcion-Lambda-CEF", `03.2-2024_Funcion-Lambda-CEF (1).ipynb`) which IS accessible
- **Root cause**: Someone duplicated the file when the original was reported missing. Both have different filenames/metadata. The duplicate (6918) was never made accessible to students but was added to the availability conditions.

---

## The Module 3 tooltip finding (last discovery, 24 Jul 2026)

Quote from the exploration:

> "give it time.. I just get back, untick 6916/17/18 again! for some reaon was ticked back on.
> Went back to Student view and not only that still blocked to continue, click on "¡Avanzá al Módulo 1! 🚀" just refresh the page at Module 2, with a toaste message "Section outline — The section Módulo 3 is not currently available."; but, also the tooltip of Module 3 shows something intresting!
>
> module 3 tab is grayed out, so there's no suggestion that the tooltip is clickable.
> And on click it shows:
>
> Information
> <LockIcon> Not available unless: The activity Show More <downArrowIcon> <--- this is blue as if it will do something but does nothing! (on Admin view this open a dropdown) hiding the link to 6918
> Notebook Funciones-CEF is marked complete ... ---> "Notebook Funciones-CEF" there links 6916, as well as "Funciones: definición y argumentos" under Notebook in biblioteca does
>
> is a combination of unfortunate events!"

When clicking the grayed-out Module 3 tab as a student:

1. A tooltip appears with: `<LockIcon> Not available unless: The activity Notebook Funciones-CEF is marked complete ... The activity Notebook Funcion-Lambda is marked complete`
2. A **blue "Show More" link** appears — but clicking it does **nothing** (on admin view this opens a dropdown showing the hidden link to the required activity)
3. The restriction text links cmid **6916** ("Notebook Funciones-CEF") as the first requirement
4. And cmid **6918** ("Notebook Funcion-Lambda") as the second requirement — the broken duplicate
5. Students see "Funciones: definición y argumentos" as the name for 6916 (works) and "Funciones lambda y programación funcional" for 6917 (works)
6. cmid 6918 has no student-facing name — it's completely invisible

### Key implication

The condition that references 6918 is at the **SECTION level** (Module 3's availability restriction), NOT at the individual module level. The `getAvailabilityJsonBreakdown()` method only extracts conditions from module-level availability JSON. Section-level conditions are missed.

**Fix applied**: The test now also parses `contents[].availability` (section-level JSON) for conditions, in addition to the module-level breakdown.

---

## Current pipeline gaps

| Gap                                                                        | Impact                                                 | Fix needed                                                                             |
| -------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------- |
| Switch-role view in gated sections is unreliable (shows 2 of 9 activities) | All content resources appear hidden → false positives  | Student API token for `core_course_get_contents` (gives real `uservisible` per module) |
| Nelthor's completion data contaminated by admin actions                    | state=1 for broken resources, state=0 for working ones | Use `timecompleted` or separate admin-vs-student account                               |
| Activity Completion report scraping returns 0                              | Missing canonical cmid list for cross-reference        | Fix scraping or use CRM API directly                                                   |
| Section-level conditions not in API breakdown                              | Some condition-referenced cmids not checked            | Already fixed (manual section JSON parsing)                                            |
| Only File-type resources checked                                           | Other resource types could also be broken              | Extend when design patterns from Ignacio arrive                                        |

---

## Next steps (Triple-Tree overlay)

See `.context/plan-triple-tree-overlay.md` for the full plan. Priority order:

1. **Student API token factory** — Create WS token per run, call `getCourseContents` with it → real visibility per role
2. **Fix completion report** — Scrape `/report/completion/` properly or use `core_completion_get_activities_completion_status` for a batch of students
3. **Build CourseDependencyGraph** — Unified tree model (nodes + edges) from each layer
4. **TreeOverlayAnalyzer** — Compare trees, generate confidence-scored findings
5. **Remove `findPhantoms()`** — Replace with overlay-based findings
6. **Design pattern integration** — When Ignacio provides the instructional design spec
