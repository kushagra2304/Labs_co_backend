import { PrismaClient, NotificationType } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const PASSWORD = "simplepass123";

const EMPLOYEES = [
  { name: "Rahul Sharma", email: "rahul@labco.io" },
  { name: "Priya Mehta", email: "priya@labco.io" },
  { name: "Ankit Roy", email: "ankit@labco.io" },
  { name: "Sara Khan", email: "sara@labco.io" },
];

const ADMIN = { name: "Utkarsh Admin", email: "admin@labco.io" };

const PROJECT_TEMPLATES = [
  { name: "Skyline Tower Complex", client: "Apex Developers", status: "in_progress" as const, progress: 72 },
  { name: "Riverside Cultural Centre", client: "City Municipality", status: "in_progress" as const, progress: 45 },
  { name: "Heritage Restoration — Fort Precinct", client: "Heritage Trust of India", status: "near_done" as const, progress: 88 },
  { name: "Metro Transit Hub", client: "Urban Rail Authority", status: "delayed" as const, progress: 31 },
  { name: "Eco Housing Cluster — Phase 2", client: "GreenBuild Corp", status: "in_progress" as const, progress: 60 },
  { name: "Downtown Office Retrofit", client: "Vertex Realty", status: "completed" as const, progress: 100 },
  { name: "Coastal Resort Masterplan", client: "Blue Horizon Hospitality", status: "in_progress" as const, progress: 38 },
  { name: "Public Library Expansion", client: "State Education Board", status: "near_done" as const, progress: 91 },
];

const TASK_TITLES = [
  "Draft structural drawings",
  "Review facade elevation",
  "Site survey report",
  "Client presentation deck",
  "BIM model coordination",
  "Material specification sheet",
  "Soil test analysis",
  "Interior layout revision",
  "MEP coordination review",
  "Cost estimate update",
  "Permit submission draft",
  "Landscape plan revision",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

function randomDateInLastYear(): Date {
  return daysAgo(Math.floor(Math.random() * 365));
}

async function main() {
  console.log("Seeding ~1 year of test data...\n");

  // ── Users ──────────────────────────────────────────────
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: ADMIN.email },
    update: {},
    create: { name: ADMIN.name, email: ADMIN.email, passwordHash, role: "admin" },
  });

  const employees = [];
  for (const e of EMPLOYEES) {
    const user = await prisma.user.upsert({
      where: { email: e.email },
      update: {},
      create: { name: e.name, email: e.email, passwordHash, role: "employee" },
    });
    employees.push(user);
  }

  console.log(`Users ready: 1 admin + ${employees.length} employees`);
  console.log(`  Login with any email above + password: ${PASSWORD}\n`);

  // ── Clear previously seeded project/task/file/activity/notification data ──
  // (Leaves Users and chat tables untouched.)
  await prisma.file.deleteMany({});
  await prisma.taskUpdate.deleteMany({});
  await prisma.workLog.deleteMany({});
  await prisma.task.deleteMany({});
  await prisma.projectMember.deleteMany({});
  await prisma.project.deleteMany({});
  await prisma.activityLog.deleteMany({});
  await prisma.notification.deleteMany({});
  await prisma.reward.deleteMany({});
  console.log("Cleared old project/task/file/activity/notification/reward data\n");

  // ── Projects ───────────────────────────────────────────
  const projects = [];
  for (const tmpl of PROJECT_TEMPLATES) {
    const createdAt = randomDateInLastYear();
    const deadline =
      tmpl.status === "completed"
        ? daysAgo(Math.floor(Math.random() * 60))
        : new Date(Date.now() + (Math.floor(Math.random() * 70) - 10) * 24 * 60 * 60 * 1000);

    const project = await prisma.project.create({
      data: {
        name: tmpl.name,
        description: `${tmpl.name} for ${tmpl.client}. Auto-generated seed data for local testing.`,
        status: tmpl.status,
        priority: randomItem(["high", "medium", "low"] as const),
        progressPercent: tmpl.progress,
        startDate: createdAt,
        deadline,
        createdById: admin.id,
        createdAt,
        createdBy: admin.id,
      },
    });
    projects.push(project);

    // Assign 2-4 random employees to this project
    const memberCount = 2 + Math.floor(Math.random() * 3);
    const shuffled = [...employees].sort(() => Math.random() - 0.5);
    for (const member of shuffled.slice(0, memberCount)) {
      await prisma.projectMember.create({
        data: { projectId: project.id, userId: member.id },
      });
    }

    // A few files per project, for the media-storage widget
    const fileTypes = ["image", "image", "image", "pdf", "pdf", "doc"] as const;
    for (const ft of fileTypes) {
      const ext = ft === "image" ? "jpg" : ft === "pdf" ? "pdf" : "docx";
      await prisma.file.create({
        data: {
          name: `${tmpl.name.slice(0, 12)}-${ft}-${Math.floor(Math.random() * 999)}.${ext}`,
          fileUrl: `https://example-storage.local/${project.id}/${ft}-${Math.random().toString(36).slice(2)}`,
          fileType: ft,
          sizeKb: 200 + Math.floor(Math.random() * 4000),
          projectId: project.id,
          uploadedBy: randomItem(employees).id,
        },
      });
    }
  }
  console.log(`Created ${projects.length} projects (with members + files)\n`);

  // ── Tasks — spread across the last 12 months, for the performance chart ──
  let taskCount = 0;
  for (let monthsAgo = 11; monthsAgo >= 0; monthsAgo--) {
    const monthDate = new Date();
    monthDate.setMonth(monthDate.getMonth() - monthsAgo);
    monthDate.setDate(1);

    const tasksThisMonth = 8 + Math.floor(Math.random() * 10); // 8-17 tasks/month

    for (let i = 0; i < tasksThisMonth; i++) {
      const createdAt = new Date(monthDate);
      createdAt.setDate(1 + Math.floor(Math.random() * 27));

      const isOlderMonth = monthsAgo >= 1;
      const completed = isOlderMonth ? Math.random() < 0.75 : Math.random() < 0.45;
      const status = completed
        ? ("completed" as const)
        : randomItem(["pending", "in_progress", "overdue"] as const);

      const dueDate = new Date(createdAt);
      dueDate.setDate(dueDate.getDate() + 3 + Math.floor(Math.random() * 10));

      const completedAt = completed
        ? new Date(createdAt.getTime() + (1 + Math.random() * 8) * 24 * 60 * 60 * 1000)
        : null;

      await prisma.task.create({
        data: {
          title: randomItem(TASK_TITLES),
          description: `Category: ${randomItem(["Design", "Engineering", "Marketing", "Operations"])}`,
          projectId: randomItem(projects).id,
          assignedTo: randomItem(employees).id,
          assignedBy: admin.id,
          status,
          priority: randomItem(["high", "medium", "low"] as const),
          dueDate,
          completedAt,
          createdAt,
          createdBy: admin.id,
        },
      });
      taskCount++;
    }
  }
  console.log(`Created ${taskCount} tasks spread across the last 12 months\n`);

  // ── A few tasks due around today, for the calendar/task-modal ──
  for (let dayOffset = -2; dayOffset <= 5; dayOffset++) {
    if (Math.random() < 0.5) continue;
    const due = new Date();
    due.setDate(due.getDate() + dayOffset);
    due.setHours(9, 0, 0, 0);

    await prisma.task.create({
      data: {
        title: randomItem(TASK_TITLES),
        description: `Category: ${randomItem(["Design", "Engineering", "Marketing", "Operations"])}`,
        projectId: randomItem(projects).id,
        assignedTo: randomItem(employees).id,
        assignedBy: admin.id,
        status: dayOffset < 0 ? "completed" : "pending",
        priority: randomItem(["high", "medium", "low"] as const),
        dueDate: due,
        completedAt: dayOffset < 0 ? due : null,
        createdBy: admin.id,
      },
    });
  }
  console.log("Seeded a few near-term tasks around today for the calendar\n");

  // ── Activity log — recent events for the Live Activity feed ──
  const activityDescriptions: Record<string, string[]> = {
    file_uploaded: ["uploaded revised facade drawings", "added 3 site survey sheets", "uploaded updated BIM model"],
    task_completed: ["submitted structural report for review", "completed the interior layout revision", "marked cost estimate update as done"],
    task_updated: ["updated task priority to high", "moved task deadline to next week"],
    project_updated: ["milestone deadline updated", "changed project status"],
    project_completed: ["marked project as completed"],
    task_created: ["created a new task for the design team"],
  };
  const actionTypes = Object.keys(activityDescriptions) as (keyof typeof activityDescriptions)[];

  for (let i = 0; i < 40; i++) {
    const hoursAgo = Math.floor(Math.random() * 24 * 14); // last 2 weeks
    const actionType = randomItem(actionTypes);

    await prisma.activityLog.create({
      data: {
        userId: randomItem(employees).id,
        actionType: actionType as any,
        description: randomItem(activityDescriptions[actionType]),
        createdAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
      },
    });
  }
  console.log("Created 40 activity log entries across the last 2 weeks\n");

  // ── Notifications — for the admin's bell icon ──
  const notifTemplates: { type: NotificationType; title: string; body: string }[] = [
    { type: "task_completed", title: "Rahul Sharma", body: "completed UI Wireframes" },
    { type: "project_completed", title: "Mobile App", body: "milestone marked overdue" },
    { type: "message", title: "Ankit Roy", body: "uploaded 3 files to Brand Identity" },
    { type: "task_assigned", title: "New task assigned", body: "Review facade elevation is due in 3 days" },
    { type: "reminder", title: "Reminder", body: "Weekly status report is due tomorrow" },
  ];

  for (let i = 0; i < notifTemplates.length; i++) {
    const t = notifTemplates[i];
    await prisma.notification.create({
      data: {
        userId: admin.id,
        type: t.type,
        title: t.title,
        body: t.body,
        isRead: i > 2,
        createdAt: new Date(Date.now() - i * 1000 * 60 * 60 * 3),
      },
    });
  }
  console.log("Created 5 notifications for the admin user\n");

  // ── Notifications — for employees ──
  const employeeNotifTemplates: { type: NotificationType; title: string; body: string }[] = [
    { type: "task_assigned", title: "New task assigned", body: "Admin assigned you task: \"Foundation Survey\"" },
    { type: "message", title: "Message from Admin", body: "Admin: \"Please check the latest drawing upload.\"" },
    { type: "project_completed", title: "Drawing approved", body: "Your uploaded structural drawing has been approved by Admin." },
    { type: "reward", title: "Badge earned", body: "You earned the \"Fast Delivery\" badge for early submission." },
    { type: "reminder", title: "Deadline changed", body: "The deadline for task \"Column Layout\" has been extended by 3 days." },
    { type: "reminder", title: "Meeting scheduled", body: "Site meeting scheduled for tomorrow at 10:00 AM." },
  ];

  for (const emp of employees) {
    for (let i = 0; i < employeeNotifTemplates.length; i++) {
      const t = employeeNotifTemplates[i];
      await prisma.notification.create({
        data: {
          userId: emp.id,
          type: t.type,
          title: t.title,
          body: t.body,
          isRead: i > 2,
          createdAt: new Date(Date.now() - i * 1000 * 60 * 60 * 4), // spaced out
        },
      });
    }
  }
  console.log(`Created ${employeeNotifTemplates.length * employees.length} notifications for employees\n`);

  console.log("✅ Seed complete.\n");
  console.log("Login credentials for testing:");
  console.log(`  ${ADMIN.email} / ${PASSWORD}  (admin)`);
  for (const e of EMPLOYEES) console.log(`  ${e.email} / ${PASSWORD}  (employee)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });