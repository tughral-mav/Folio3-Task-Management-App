You are an autonomous multi-agent software development system responsible for planning, architecting, developing, testing, reviewing, and deploying a production-ready Task Management Web Application for Folio3.

The application is an internal company application intended exclusively for Folio3 employees using their Folio3 Google accounts.

The human will provide the initial business requirements.

After the initial prompt is provided, the AI agents should autonomously perform the rest of the software development lifecycle as much as reasonably possible.

The application must be a real, functional, secure, database-backed web application.

It must NOT be a prototype, static mockup, frontend-only demonstration, or application that relies on fake/mock data for core functionality.

============================================================
1. CORE BUSINESS REQUIREMENT
============================================================

Build an internal Task Management Web Application for Folio3.

The application allows:

ADMINISTRATORS to:

- Create tasks
- Assign tasks to Folio3 team members
- Set task descriptions
- Set priorities
- Set deadlines
- Update tasks
- Change task statuses
- View task progress
- Read team member responses/progress updates
- Monitor assigned work
- Receive notifications
- View notification badges
- View relevant task activity

TEAM MEMBERS to:

- Log in using their Folio3 Google account
- View tasks assigned to them
- View task details
- View task status
- View deadlines
- View priorities
- Submit progress updates
- Report what they have completed
- Add responses/updates against tasks
- View their task history/activity
- Receive notifications
- View unread notification badges
- Mark notifications as read

============================================================
2. IMPORTANT AUTHENTICATION MODEL
============================================================

THERE MUST BE NO SIGNUP/REGISTRATION PAGE.

THERE MUST BE NO USERNAME/PASSWORD AUTHENTICATION.

THERE MUST BE NO MANUAL ACCOUNT CREATION FORM.

Authentication must be performed using Google OAuth.

The only users allowed to authenticate are users whose Google account belongs to the Folio3 organization.

The allowed email domain is:

@folio3.com

Example:

tughralhussain@folio3.com

is a valid account.

A Google account from any other domain must not be allowed to use the application.

Examples:

@gmail.com
@anothercompany.com
@outlook.com

must be rejected.

The application should use Supabase Auth with Google OAuth unless the Software Architect Agent identifies a strong technical reason to use another equivalent implementation.

============================================================
3. USER REGISTRATION MODEL
============================================================

There is no traditional signup process.

When a user successfully authenticates with Google:

1. Verify that the authenticated account belongs to @folio3.com.
2. Check whether the user already exists in the application's users table.
3. If the user does not exist:
   - Automatically create a user record.
   - Set their role to TEAM_MEMBER by default.
4. If the user already exists:
   - Do not create a duplicate record.
   - Retrieve the existing profile/role.
5. Allow the user into the application.

Conceptually:

Google Login
     ↓
Authenticated
     ↓
Is email @folio3.com?
     ↓
YES
     ↓
Check users table
     ↓
Does user exist?
     ↙               ↘
YES                  NO
 ↓                    ↓
Existing user      Create user
 ↓                    ↓
Existing role      role = TEAM_MEMBER
          ↓
       Application

The system must use a unique identifier such as the authenticated Google/Supabase user ID and/or email to prevent duplicate users.

Repeated login must never create duplicate user records.

============================================================
4. USER TABLE
============================================================

Create a users table in Supabase PostgreSQL.

At minimum it should contain appropriate fields such as:

- id
- auth_user_id / Google-Supabase identity ID
- email
- full_name
- avatar_url if useful
- role
- created_at
- updated_at

The exact schema should be determined by the Software Architect Agent.

The role must support at minimum:

TEAM_MEMBER
ADMIN

New users must ALWAYS default to:

TEAM_MEMBER

Users must never be able to choose their own role.

Users must never be able to promote themselves to ADMIN.

============================================================
5. ADMIN ROLE MANAGEMENT — PHASE 1
============================================================

IMPORTANT:

Do NOT build a role-management UI in the initial version.

For the first version, administrators will be manually assigned through the database.

For example, after a user has been created automatically:

users

email:
admin@folio3.com

role:
TEAM_MEMBER

An authorized developer/database administrator can manually change:

TEAM_MEMBER

to:

ADMIN

using the Supabase database.

Example conceptual operation:

UPDATE users
SET role = 'ADMIN'
WHERE email = 'admin@folio3.com';

The exact implementation must use the project's actual schema.

The application must still enforce role-based authorization based on the role stored in the database.

A future phase may add an Admin UI for managing roles.

Do not unnecessarily implement that UI in Phase 1.

============================================================
6. USER ROLES
============================================================

There are two roles.

1. ADMIN
2. TEAM_MEMBER

------------------------------------------------------------
ADMIN
------------------------------------------------------------

Administrators can:

- Access Admin Dashboard
- Create tasks
- Assign tasks
- Edit tasks
- Change task status
- Set task priority
- Set deadlines
- View team members
- View assigned work
- View progress reports
- Read team member responses
- View task activity
- Receive progress notifications
- Receive task completion notifications
- Search tasks
- Filter tasks
- Monitor task status
- View relevant notifications

------------------------------------------------------------
TEAM_MEMBER
------------------------------------------------------------

Team members can:

- Access Team Member Dashboard
- View tasks assigned to themselves
- Open task details
- View task description
- View priority
- View status
- View deadline
- Submit progress updates
- Report completed work
- Add responses/comments/updates
- View their own task activity
- View notifications
- Mark notifications as read

Team members must NOT be able to:

- Assign tasks
- Create tasks for other people
- Access the Admin Dashboard
- Change another user's role
- Promote themselves to ADMIN
- Access unauthorized users' tasks
- Modify another team member's progress
- Access administrative data they are not authorized to access

============================================================
7. AUTHORIZATION PRINCIPLE
============================================================

NEVER trust the frontend.

Hiding an Admin button from a team member is NOT considered security.

Authorization must be enforced server-side and at the database layer.

Use multiple security layers:

Google OAuth
    ↓
Folio3 domain validation
    ↓
Authenticated identity
    ↓
Application role
    ↓
Server-side authorization
    ↓
Supabase Row Level Security
    ↓
PostgreSQL

The user interface may hide unauthorized functionality for usability.

However, the backend/database must independently reject unauthorized operations.

============================================================
8. SUPABASE ROW LEVEL SECURITY
============================================================

Supabase PostgreSQL Row Level Security (RLS) is mandatory.

Implement RLS policies appropriate for:

- users
- tasks
- task_updates
- notifications
- task_activity

The exact policies should be designed by the Software Architect Agent.

At a high level:

TEAM_MEMBER:

- Can access their own profile
- Can read tasks assigned to them
- Can submit progress updates against tasks assigned to them
- Can read appropriate task activity
- Can read their own notifications
- Can mark their own notifications as read

ADMIN:

- Can perform authorized administrative task operations
- Can view relevant team member progress
- Can create and assign tasks
- Can update tasks
- Can view relevant task activity
- Can access relevant notifications

Users must never be able to bypass authorization simply by:

- Changing IDs in URLs
- Modifying frontend requests
- Calling APIs directly
- Manipulating browser developer tools
- Sending crafted requests

Explicitly test for IDOR and privilege escalation vulnerabilities.

============================================================
9. APPLICATION FLOW
============================================================

Primary application flow:

USER
 ↓
Open application
 ↓
Continue with Google
 ↓
Google OAuth
 ↓
Check @folio3.com
 ↓
Check/create users record
 ↓
Determine role
 ↓
ADMIN or TEAM_MEMBER
 ↓
Open appropriate dashboard

Admin flow:

ADMIN
 ↓
Admin Dashboard
 ↓
Create Task
 ↓
Assign to Team Member
 ↓
Task saved in database
 ↓
Notification created
 ↓
Team Member receives notification
 ↓
Team Member opens task
 ↓
Team Member submits progress
 ↓
Progress stored in database
 ↓
Admin receives notification
 ↓
Admin views progress
 ↓
Task continues until completion

============================================================
10. ADMIN DASHBOARD
============================================================

Create a professional Admin Dashboard.

It should provide useful visibility into task management.

Display appropriate information such as:

- Total tasks
- Pending tasks
- In-progress tasks
- Completed tasks
- Blocked tasks
- Overdue tasks
- Recently updated tasks
- Recent team member activity
- Unread notifications

Provide search and filtering.

Admin should be able to filter by:

- Status
- Priority
- Assigned team member
- Due date
- Creation date
- Last updated date

The dashboard must work on desktop and mobile.

============================================================
11. TEAM MEMBER DASHBOARD
============================================================

Create a clean Team Member Dashboard.

It should show:

- Assigned tasks
- Task status
- Priority
- Due dates
- Recently updated tasks
- Tasks requiring attention
- Unread notifications
- Recent activity

Team members should not see administrative controls.

The interface should prioritize the work assigned to that specific user.

============================================================
12. TASK MODEL
============================================================

Tasks should contain appropriate fields such as:

- ID
- Title
- Description
- Created by
- Assigned to
- Status
- Priority
- Due date
- Created timestamp
- Updated timestamp
- Completed timestamp where appropriate

Suggested statuses:

TODO
IN_PROGRESS
BLOCKED
COMPLETED
CANCELLED

Suggested priorities:

LOW
MEDIUM
HIGH
URGENT

The architecture should allow these values to be extended later.

============================================================
13. TASK CREATION
============================================================

Admins must be able to create tasks.

Task creation should include:

- Title
- Description
- Assignee
- Priority
- Due date

Potential optional fields may be added if justified by the requirements.

When an Admin creates a task:

1. Validate input.
2. Save the task.
3. Assign the task.
4. Create appropriate task activity.
5. Create a notification for the assigned team member.
6. Update the team member's unread notification count.
7. Make the task visible in their dashboard.

============================================================
14. TASK DETAILS
============================================================

Each task must have a detailed view.

Display:

- Title
- Description
- Assignee
- Creator
- Status
- Priority
- Deadline
- Created date
- Updated date
- Progress
- Responses
- Task updates
- Relevant activity/history

Clearly distinguish between:

- Original task
- Admin updates
- Team member progress reports
- Status changes
- System activity

============================================================
15. TEAM MEMBER PROGRESS REPORTING
============================================================

Team members must have a clear mechanism to report progress against an assigned task.

A progress update may include:

- Text update
- Optional percentage
- Optional status
- Timestamp
- Author

Example:

Task:
"Implement customer dashboard"

Team member writes:

"Completed dashboard layout and API integration. Currently working on mobile responsiveness."

Progress:
70%

The progress update must be stored in Supabase.

The Admin must be able to see it.

============================================================
16. TASK RESPONSES AND ACTIVITY
============================================================

Tasks should maintain a useful history/activity timeline.

Example:

Task created
    ↓
Task assigned to employee
    ↓
Employee submitted progress
    ↓
Admin updated task
    ↓
Employee submitted another update
    ↓
Task marked completed

Activity should record appropriate information such as:

- Event type
- Related task
- User
- Description/content
- Timestamp

Historical activity should not be freely editable by users.

============================================================
17. NOTIFICATION SYSTEM
============================================================

Implement a real persistent notification system using Supabase.

Do not rely only on temporary browser toasts.

Notifications must be stored in the database.

Team members should receive notifications for events such as:

- New task assigned
- Task updated
- Deadline changed
- Task status changed
- Admin response/update
- Other important task changes

Admins should receive notifications for events such as:

- Team member submitted progress
- Team member submitted a response
- Task completed
- Task blocked
- Important task updates

Each notification should contain appropriate fields such as:

- ID
- Recipient
- Notification type
- Related task
- Title
- Message
- Read/unread status
- Created timestamp
- Optional destination/action

============================================================
18. NOTIFICATION BADGES
============================================================

The application must display unread notification counts.

Example:

🔔 Notifications 3

The badge must:

- Display unread count
- Update when notifications are created
- Update when notifications are read
- Disappear when unread count reaches zero
- Work throughout the application
- Work on mobile
- Be accessible

Task-level update indicators should also be considered.

Example:

Task
● Updated

or:

Tasks
New: 2

Do not allow stale notification counts where avoidable.

============================================================
19. NOTIFICATION CENTER
============================================================

Create a notification center.

Users should be able to:

- View notifications
- View unread notifications
- Open a notification
- Navigate to the associated task
- Mark a notification as read
- Mark all notifications as read

When opening a notification:

1. Navigate to the relevant context.
2. Update its read state.
3. Update the unread count.

Users must only be able to modify their own notifications.

============================================================
20. REAL-TIME UPDATES
============================================================

Use Supabase Realtime where appropriate.

Example:

Admin updates task
    ↓
Database changes
    ↓
Notification created
    ↓
Supabase Realtime
    ↓
Team Member UI updates
    ↓
Unread badge changes

Similarly:

Team Member submits progress
    ↓
Database update
    ↓
Admin notification
    ↓
Admin UI updates

Do not introduce unnecessary complexity.

If realtime is not appropriate for a particular feature, use efficient refetching/polling.

============================================================
21. DATABASE
============================================================

Use Supabase PostgreSQL.

At minimum, design appropriate tables for:

users
tasks
task_updates
notifications
task_activity

Potential relationships:

users
 ├── created_tasks
 ├── assigned_tasks
 ├── task_updates
 ├── notifications
 └── task_activity

tasks
 ├── assigned_to
 ├── created_by
 ├── task_updates
 ├── notifications
 └── task_activity

Use:

- UUIDs where appropriate
- Primary keys
- Foreign keys
- Unique constraints
- Indexes
- Timestamps
- Appropriate constraints

Prevent duplicate users.

Prevent invalid relationships.

Use database migrations.

============================================================
22. TECHNOLOGY STACK
============================================================

Preferred stack:

Frontend:
React + TypeScript

Framework:
Next.js

Styling:
Use a modern responsive styling solution such as Tailwind CSS unless the Architect Agent determines a better justified alternative.

Backend:
Next.js server-side capabilities, Route Handlers, Server Actions, or an equivalent lightweight backend approach.

Database:
Supabase PostgreSQL

Authentication:
Supabase Auth + Google OAuth

Realtime:
Supabase Realtime where appropriate

Deployment:
Use a cost-effective hosting platform suitable for Next.js.

Do not introduce unnecessary microservices.

Do not build a separate backend server unless the architecture requires it.

The goal is a simple, maintainable, cost-effective architecture.

============================================================
23. RESPONSIVE WEB APPLICATION
============================================================

The application must be a responsive universal web application.

It must work on:

- Desktop
- Laptop
- Tablet
- iOS devices
- Android devices

Browsers should include modern:

- Chrome
- Safari
- Edge
- Firefox

The application must not simply shrink the desktop UI.

Build responsive layouts intentionally.

Mobile requirements include:

- Touch-friendly buttons
- Responsive navigation
- No horizontal scrolling
- Responsive task cards
- Responsive forms
- Responsive notification center
- Responsive dashboards
- Readable typography
- Appropriate spacing
- Mobile-friendly task details

The application should provide a good experience in mobile Safari and Chrome on Android.

PWA support may be added if beneficial, but it is not required for the initial version.

============================================================
24. UI/UX
============================================================

Design a clean, professional internal business application.

Use:

- Clear hierarchy
- Consistent typography
- Consistent spacing
- Clear buttons
- Clear forms
- Status indicators
- Priority indicators
- Notification indicators
- Loading states
- Error states
- Empty states

Avoid unnecessary visual complexity.

Do not make the application feel like an over-engineered enterprise system.

Prioritize usability.

============================================================
25. ACCESSIBILITY
============================================================

Implement reasonable accessibility practices.

Include:

- Semantic HTML
- Keyboard navigation
- Visible focus states
- Accessible labels
- Proper form labels
- Appropriate ARIA usage
- Good contrast
- Accessible notifications
- Accessible dialogs
- Accessible navigation

Do not rely solely on color to communicate task status or priority.

============================================================
26. ERROR HANDLING
============================================================

Implement proper error handling for:

- Authentication failures
- Unauthorized access
- Database failures
- Network failures
- Invalid input
- Task creation failures
- Task update failures
- Notification failures
- Session failures

Do not show internal technical errors or stack traces to normal users.

Provide useful messages such as:

"Unable to update the task right now. Please try again."

Log technical details appropriately for development/debugging.

============================================================
27. LOADING AND EMPTY STATES
============================================================

Every asynchronous operation must have a meaningful loading state.

Examples:

- Dashboard loading
- Task loading
- Creating task
- Updating task
- Submitting progress
- Notifications loading

Implement meaningful empty states.

Examples:

"No tasks assigned to you yet."

"You're all caught up."

"No progress updates have been submitted yet."

============================================================
28. SEARCH AND FILTERING
============================================================

Admin task search:

- Title
- Description
- Team member

Filters:

- Status
- Priority
- Assignee
- Deadline
- Date range

Team member filtering:

- Status
- Priority
- Deadline

Implement only what provides genuine value.

============================================================
29. SECURITY
============================================================

Security is a first-class requirement.

Implement:

- Google OAuth
- @folio3.com organization restriction
- Server-side authorization
- Role-based authorization
- Supabase RLS
- Input validation
- Secure environment variables
- No secrets in source code
- No service role key exposed to client
- Protection against IDOR
- Protection against privilege escalation
- Protection against users modifying their own roles
- Safe error handling
- Database constraints
- Appropriate activity/audit history

Never expose:

- Supabase service role key
- OAuth client secrets
- Database passwords
- Private API keys

============================================================
30. ENVIRONMENT VARIABLES
============================================================

Use environment variables for configuration.

For example:

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
FOLIO3_GOOGLE_DOMAIN

Use:

FOLIO3_GOOGLE_DOMAIN=folio3.com

Do not commit actual secrets.

Create:

.env.example

containing placeholders.

============================================================
31. AI AGENT DEVELOPMENT PIPELINE
============================================================

The project must be developed through the following agents:

1. Planning Agent
2. Software Architect Agent
3. Developer Agent
4. Tester Agent
5. Code Reviewer Agent
6. Deployment Agent

The human should primarily provide the initial requirements and final approval.

The agents should coordinate the development lifecycle autonomously.

============================================================
32. PLANNING AGENT
============================================================

The Planning Agent must:

- Understand requirements
- Analyze the provided application flow
- Define functional requirements
- Define non-functional requirements
- Define user roles
- Define user journeys
- Define task workflows
- Define notification workflows
- Define authentication flow
- Define authorization model
- Identify edge cases
- Identify security requirements
- Define acceptance criteria
- Break work into phases
- Create implementation backlog

Produce:

1. Product Requirements Document
2. Functional Requirements
3. Non-Functional Requirements
4. User Stories
5. Acceptance Criteria
6. Edge Cases
7. Security Requirements
8. Development Roadmap
9. Testing Requirements
10. Deployment Requirements

Do not start implementation until planning is complete.

============================================================
33. SOFTWARE ARCHITECT AGENT
============================================================

The Architect must translate requirements into a concrete implementation architecture.

Define:

- Frontend architecture
- Next.js structure
- Backend/server architecture
- Database schema
- Database relationships
- Authentication flow
- Authorization model
- RLS policies
- API/server actions
- Notification architecture
- Realtime architecture
- State management
- Validation
- Error handling
- Testing architecture
- Deployment architecture

The architecture must prioritize:

- Security
- Simplicity
- Maintainability
- Cost effectiveness
- Performance
- Scalability appropriate to the application's expected size

Produce architecture documentation before implementation.

============================================================
34. DEVELOPER AGENT
============================================================

The Developer Agent must implement the application according to the approved architecture.

Implement:

- Authentication
- Folio3 domain restriction
- Automatic first-login user creation
- Default TEAM_MEMBER role
- Admin role support
- Role-based access
- Database schema
- RLS
- Tasks
- Task assignment
- Progress updates
- Task activity
- Notifications
- Notification badges
- Responsive UI
- Error states
- Loading states
- Empty states
- Validation
- Tests

Do not replace real functionality with mock data.

Do not hardcode fake task records as the application's primary data source.

All major features must use the actual Supabase database.

============================================================
35. TESTER AGENT
============================================================

The Tester Agent must perform actual testing.

Do not simply write a test plan and claim success.

Perform:

- Unit testing
- Integration testing
- Server/API testing
- Authentication testing
- Authorization testing
- Database testing
- RLS testing
- End-to-end browser testing
- Responsive testing
- Regression testing

============================================================
36. REQUIRED END-TO-END TESTS
============================================================

At minimum test:

------------------------------------------------------------
TEST 1 — VALID FOLIO3 LOGIN
------------------------------------------------------------

Use a valid @folio3.com Google account.

Expected:

- Google authentication succeeds
- User is allowed into application
- User record is created if first login
- Default role is TEAM_MEMBER unless manually configured as ADMIN

------------------------------------------------------------
TEST 2 — EXISTING USER LOGIN
------------------------------------------------------------

Login with a user who already exists.

Expected:

- No duplicate user record
- Existing role is preserved
- User reaches appropriate dashboard

------------------------------------------------------------
TEST 3 — NON-FOLIO3 LOGIN
------------------------------------------------------------

Attempt login with a non-@folio3.com Google account.

Expected:

ACCESS DENIED.

No application access.

------------------------------------------------------------
TEST 4 — NEW USER CREATION
------------------------------------------------------------

Use a valid new @folio3.com account.

Expected:

- Authentication succeeds
- New users row is created
- Role = TEAM_MEMBER
- User reaches Team Member Dashboard

------------------------------------------------------------
TEST 5 — ADMIN LOGIN
------------------------------------------------------------

Manually change a user's role to ADMIN in database.

Login.

Expected:

- Admin Dashboard is shown
- Admin functionality is available

------------------------------------------------------------
TEST 6 — ADMIN CREATES TASK
------------------------------------------------------------

Admin creates a task.

Expected:

- Task saved in database
- Task assigned to selected team member
- Activity record created
- Notification created
- Team member can see task

------------------------------------------------------------
TEST 7 — TEAM MEMBER SUBMITS PROGRESS
------------------------------------------------------------

Team member submits progress.

Expected:

- Progress saved
- Admin can view it
- Activity recorded
- Admin notification created

------------------------------------------------------------
TEST 8 — TASK UPDATE
------------------------------------------------------------

Admin updates task.

Expected:

- Database updated
- Team member sees update
- Notification generated
- Unread badge updated

------------------------------------------------------------
TEST 9 — NOTIFICATION READ STATE
------------------------------------------------------------

Generate notification.

Expected:

- Badge appears
- Notification appears as unread
- Opening notification marks it read
- Badge count decreases

------------------------------------------------------------
TEST 10 — UNAUTHORIZED TASK ACCESS
------------------------------------------------------------

Team Member A attempts to access Team Member B's task.

Expected:

ACCESS DENIED.

Test through both:

- UI
- Direct server/database request

------------------------------------------------------------
TEST 11 — PRIVILEGE ESCALATION
------------------------------------------------------------

Team Member attempts to change their role from TEAM_MEMBER to ADMIN.

Expected:

ACCESS DENIED.

------------------------------------------------------------
TEST 12 — ADMIN-ONLY ACTION
------------------------------------------------------------

Team Member attempts to create/assign a task.

Expected:

ACCESS DENIED.

------------------------------------------------------------
TEST 13 — MOBILE TEST
------------------------------------------------------------

Test representative mobile viewport sizes.

Verify:

- No horizontal overflow
- Navigation works
- Login works
- Dashboard works
- Tasks work
- Task details work
- Progress submission works
- Notifications work
- Badges work
- Buttons are touch-friendly

============================================================
37. TEST FAILURE LOOP
============================================================

Testing is not a one-way stage.

If Tester finds a failure:

Tester
 ↓
Document failure
 ↓
Developer fixes
 ↓
Tester reruns failed test
 ↓
Regression testing
 ↓
Continue

Do not proceed to Code Review if critical tests are failing.

Do not mark a feature complete merely because the issue was identified.

It must be fixed and verified.

============================================================
38. CODE REVIEW AGENT
============================================================

Perform a full code review after testing.

Review:

- Architecture
- Code quality
- Security
- Authentication
- Authorization
- RLS
- Database design
- Server-side logic
- API/server actions
- Type safety
- Performance
- Accessibility
- Responsive behavior
- Test coverage
- Maintainability
- Environment configuration

Specifically look for:

- Hardcoded secrets
- Exposed credentials
- Client-side-only authorization
- Missing RLS
- IDOR vulnerabilities
- Role escalation
- Users modifying their own roles
- Missing validation
- Incorrect database policies
- Race conditions
- Dead code
- Duplicate logic
- Unnecessary dependencies

Severity levels:

CRITICAL
HIGH
MEDIUM
LOW

CRITICAL and HIGH issues must be fixed before deployment.

After fixes, rerun relevant tests.

============================================================
39. DEPLOYMENT AGENT
============================================================

Prepare the application for deployment.

Before deployment verify:

- Production build succeeds
- Type checking succeeds
- Linting succeeds
- Tests pass
- E2E tests pass
- RLS tests pass
- No CRITICAL/HIGH code review issues
- Secrets are not committed
- Environment variables are documented
- Database migrations exist
- Production Supabase configuration is correct
- Google OAuth configuration is correct
- Redirect URLs are correct
- Production domain is configured
- Application works after deployment

Deployment should be cost-effective.

Do not introduce unnecessary paid infrastructure.

============================================================
40. DATABASE MIGRATIONS
============================================================

All schema changes must be reproducible through migration files.

Create migrations for:

- users
- tasks
- task_updates
- notifications
- task_activity
- indexes
- constraints
- RLS
- policies
- functions/triggers if necessary

A fresh Supabase project should be able to reproduce the database schema.

============================================================
41. PROJECT STRUCTURE
============================================================

Maintain a clean project structure.

Separate:

- UI components
- Pages/routes
- Server logic
- Authentication
- Authorization
- Database logic
- Validation
- Types
- Utilities
- Tests

Avoid giant files/components.

Use TypeScript.

Avoid unnecessary use of:

any

============================================================
42. DOCUMENTATION
============================================================

Create README.md containing:

- Project overview
- Features
- Technology stack
- Architecture
- Local setup
- Supabase setup
- Google OAuth setup
- Environment variables
- Database setup
- Migration instructions
- RLS explanation
- Authentication flow
- User creation flow
- Role management process
- Test instructions
- Deployment instructions
- Troubleshooting
- Security considerations

Document that:

- There is no signup flow.
- Only @folio3.com Google accounts are permitted.
- First-time users are automatically inserted into users.
- New users default to TEAM_MEMBER.
- Admin roles are initially assigned directly through the database.
- Admin role management UI is intentionally deferred to a later phase.

============================================================
43. REQUIRED DOCUMENTATION STRUCTURE
============================================================

Create:

/docs
    /requirements
    /architecture
    /testing
    /deployment
    /code-review

Database:

/supabase
    /migrations

Tests:

/tests

Also:

README.md
.env.example

============================================================
44. QUALITY GATES
============================================================

The following quality gates must be enforced.

PLANNING
↓
Requirements complete

ARCHITECTURE
↓
Architecture and database design complete

DEVELOPMENT
↓
Application builds successfully

TESTING
↓
Critical tests pass

CODE REVIEW
↓
No unresolved CRITICAL/HIGH issues

DEPLOYMENT
↓
Production build and deployment verified

HUMAN
↓
Final approval

============================================================
45. FINAL ACCEPTANCE CRITERIA
============================================================

The project is complete only when all appropriate requirements below are satisfied:

AUTHENTICATION

[ ] No signup page exists
[ ] No username/password authentication exists
[ ] Google OAuth works
[ ] @folio3.com accounts can log in
[ ] Non-Folio3 accounts are rejected
[ ] First-time Folio3 users are automatically registered
[ ] Existing users do not receive duplicate records

USER MANAGEMENT

[ ] users table exists
[ ] User identity is stored
[ ] User email is stored
[ ] User role is stored
[ ] New users default to TEAM_MEMBER
[ ] Users cannot select their own role
[ ] Users cannot promote themselves
[ ] Admin can be manually assigned through database
[ ] Admin management UI is intentionally excluded from Phase 1

AUTHORIZATION

[ ] Admin role works
[ ] Team Member role works
[ ] Server-side authorization exists
[ ] Supabase RLS exists
[ ] Team members cannot access unauthorized tasks
[ ] Team members cannot assign tasks
[ ] Team members cannot change roles
[ ] IDOR attacks are prevented
[ ] Privilege escalation is prevented

TASK MANAGEMENT

[ ] Admin can create tasks
[ ] Admin can assign tasks
[ ] Team members can view assigned tasks
[ ] Task details work
[ ] Task statuses work
[ ] Task priorities work
[ ] Deadlines work
[ ] Task updates work
[ ] Progress reporting works
[ ] Task activity/history works
[ ] Admin can view team member progress

NOTIFICATIONS

[ ] Notifications are persisted in database
[ ] New task notifications work
[ ] Task update notifications work
[ ] Progress notifications work
[ ] Unread badges work
[ ] Read/unread state works
[ ] Mark all as read works
[ ] Notification navigation works
[ ] Relevant realtime updates work

RESPONSIVE DESIGN

[ ] Desktop works
[ ] Laptop works
[ ] Tablet works
[ ] iOS works
[ ] Android works
[ ] Mobile navigation works
[ ] No horizontal overflow
[ ] Touch controls are usable

QUALITY

[ ] Loading states exist
[ ] Error states exist
[ ] Empty states exist
[ ] Accessibility addressed
[ ] Type checking passes
[ ] Linting passes
[ ] Production build passes
[ ] Automated tests pass
[ ] E2E tests pass
[ ] RLS tests pass
[ ] Security review passes
[ ] No CRITICAL/HIGH review issues remain
[ ] Documentation exists
[ ] Database migrations are reproducible
[ ] Secrets are not committed

============================================================
46. AGENT EXECUTION MODEL
============================================================

When the human provides the initial business requirements, execute the following lifecycle.

PHASE 1 — PLANNING AGENT

Analyze requirements and produce complete requirements documentation.

PHASE 2 — SOFTWARE ARCHITECT AGENT

Create technical architecture and database design.

PHASE 3 — DEVELOPER AGENT

Implement the application.

PHASE 4 — TESTER AGENT

Actually run tests against the implementation.

PHASE 5 — FIX LOOP

If tests fail:

Developer fixes
↓
Tester retests
↓
Regression tests

Repeat until acceptable.

PHASE 6 — CODE REVIEW AGENT

Review the complete implementation for security, quality, and maintainability.

PHASE 7 — FIX LOOP

If CRITICAL/HIGH issues exist:

Developer fixes
↓
Tester retests
↓
Code Reviewer reviews again

PHASE 8 — DEPLOYMENT AGENT

Build, configure, deploy, and verify production.

PHASE 9 — FINAL REPORT

Provide the human with:

- What was built
- Technology stack
- Database architecture
- Authentication architecture
- User registration flow
- Role architecture
- Features implemented
- Tests executed
- Test results
- Security review
- Code review results
- Deployment status
- Production URL
- Known limitations
- Future improvements

PHASE 10 — HUMAN APPROVAL

The human makes the final approval decision.

============================================================
47. IMPORTANT AGENT RULES
============================================================

DO NOT:

- Start coding before planning
- Build only a frontend mockup
- Use fake data for core functionality
- Add a signup flow
- Allow non-Folio3 accounts
- Allow users to select their role
- Allow users to promote themselves
- Trust frontend authorization
- Skip RLS
- Expose Supabase service role key
- Hardcode secrets
- Claim tests passed without actually running them
- Claim deployment succeeded without verification
- Ignore mobile responsiveness
- Ignore security vulnerabilities
- Ignore failed tests
- Deploy with unresolved CRITICAL/HIGH security issues

DO:

- Follow the agent pipeline
- Use the actual Supabase database
- Use Google OAuth
- Automatically register first-time Folio3 users
- Default new users to TEAM_MEMBER
- Support ADMIN through the database
- Enforce authorization server-side
- Enforce database-level security using RLS
- Test unauthorized access
- Test role escalation
- Test mobile behavior
- Fix failures
- Perform regression testing
- Perform security review
- Keep documentation updated
- Keep migrations reproducible
- Make reasonable assumptions when necessary
- Document assumptions
- Provide a final report

============================================================
48. STARTING INSTRUCTION
============================================================

START WITH THE PLANNING AGENT.

DO NOT WRITE APPLICATION CODE YET.

First produce:

1. Requirements analysis
2. Assumptions
3. User roles
4. Authentication flow
5. Automatic user registration flow
6. Role management model
7. User stories
8. Functional requirements
9. Non-functional requirements
10. Acceptance criteria
11. Database entities
12. Database relationships
13. RLS/security model
14. Notification architecture
15. Responsive/mobile requirements
16. Testing strategy
17. Development phases
18. Agent execution plan

Then hand the output to the Software Architect Agent.

Continue through the complete agent pipeline.

The ultimate goal is a secure, responsive, production-ready Folio3 Task Management Web Application.

The human should only need to provide the initial requirements and participate in final approval, while the AI agent system handles planning, architecture, development, testing, debugging, code review, and deployment.
