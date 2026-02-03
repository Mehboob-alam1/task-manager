# Omega Task Management - User Guide

## Overview
This system helps you create, assign, and track client tasks, generate invoices, and receive notifications.
Roles define what each user can see and do.

## Roles
- `Admin`: Full access to users, tasks, reports, invoices, and system settings.
- `Manager`: Can create and assign tasks to staff, view dashboards, and generate invoices.
- `Staff`: Can view and update their assigned tasks and generate invoices for their own work.

## Signing In
1. Open the app and log in with your email and password.
2. If you are newly signed up, your account must be approved by an Admin before access is granted.

## Dashboards
- `Admin Dashboard`: Full task view, staff filters, and overdue tracking.
- `Manager Dashboard`: Team task view and assignment support.
- `Staff Dashboard`: Your assigned tasks only.

## Creating and Assigning Tasks
1. Go to `Create Task`.
2. Fill in client name, task title, and description.
3. Choose an `Assigned Employee`.
   - Admins can assign to managers or staff.
   - Managers can assign to staff (and themselves).
   - Staff tasks are auto-assigned to themselves.
4. Select a `Task Category` and `Task Type`.
5. Choose `Priority` (Low, Medium, High, Urgent).
6. Enter the `Net Invoice Amount`.
7. Click `Create Task`.

### Task Categories and Types
- `Tax Services`: Includes 1099 Creation and E-file.
- `Accounting Services`: Includes Invoice, P&L, and Compliance Check.
- `Consulting Services`: Includes Consulting Call and New Business Setup.
- `Other`: Use when none of the standard categories apply.

### Task Type Notes
- `Marked Financial Statements`: Prepared financial statements without an audit opinion (internal/management-use).
- `Audit Services`: Independent examination providing assurance on financial statements.

## Deadlines
- New tasks are automatically set to a `72-hour` deadline.
- When editing a task, you can manually change the deadline.

## Priorities
- Use `Urgent` for tasks that require immediate attention.
- Priority colors appear across the dashboard, calendar, and task details.

## Invoices
1. Open `Invoices`.
2. Select `Daily`, `Weekly`, or `Monthly`.
3. Choose a date and client.
4. Click `Generate Invoice`.
5. Review the preview and click `Save Invoice`.

Notes:
- You can generate invoices for `any` task (not only completed tasks).
- Staff can only generate invoices for tasks assigned to them.
- Admins and managers can generate invoices across clients.
- You can also download batch PDFs for the current week or month from the invoice list view.

## Notifications
- You receive notifications for:
  - Task assignments
  - Overdue tasks
- Open `Notifications` to review and mark items as read.
- Overdue email alerts are sent if SMTP is configured on the backend.

## Reports (Admin Only)
- Daily reports summarize completed, pending, and overdue tasks.
- Open `Reports` from the sidebar.

## User Management (Admin Only)
- Add, update roles, and delete users from `Users`.
- Deleting a user removes their account but keeps reports and files they created.

## Tips
- Use the `Calendar` for deadline visibility.
- Filter dashboards by status, client, and staff to focus quickly.
