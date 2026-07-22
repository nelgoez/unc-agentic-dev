## Task 1: MoodleApiClient — Add enrolment WS functions

**File:** `tests/components/api/MoodleApiClient.ts`

Add two new methods to `MoodleApiClient`:

```typescript
@atc('MAC-X', { story: 'UNC-RE-1', feature: 'Enrolment' })
async getCourseEnrolMethods(courseId: number): Promise<Array<{id: number, type: string, name: string}>>
// WS: core_enrol_get_course_enrolment_methods
// Parameter: courseid (int)
// Returns: array of enrolment method objects

@atc('MAC-Y', { story: 'UNC-RE-1', feature: 'Enrolment' })
async submitUserEnrolmentForm(formdata: string): Promise<{result: boolean, error?: string}>
// WS: core_enrol_submit_user_enrolment_form
// Parameter: formdata (string) — URI encoded param string
// Example formdata: "enrolid=XX&courseid=YY&userid=ZZ&roleid=5"
// Returns: processing result with error flag
```

