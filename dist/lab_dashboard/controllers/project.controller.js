"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const client_1 = __importDefault(require("../../prisma/client"));
function toFrontendStatus(status, deadline, progress) {
    if (status === "completed")
        return "Completed";
    if (status === "delayed")
        return "Overdue";
    if (deadline) {
        const daysLeft = (deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
        if (daysLeft < 0)
            return "Overdue";
        if (daysLeft <= 7 && progress < 70)
            return "At Risk";
    }
    return "Active";
}
function toPrismaStatus(status) {
    switch (status) {
        case "Completed": return "completed";
        case "Overdue": return "delayed";
        case "At Risk": return "in_progress";
        default: return "in_progress";
    }
}
function fmtDate(d) {
    return d ? d.toISOString().slice(0, 10) : "";
}
function toListJSON(p) {
    const activeMembers = (p.members ?? []).filter((m) => !m.deletedAt);
    return {
        id: p.id,
        name: p.name,
        client: p.client ?? "",
        supervisor: p.creator?.name ?? "",
        members: activeMembers.length,
        // Real assignee list — used by the "assign employees" picker on the
        // create/edit form and to tell whether a project is unclaimed (no
        // assignees at all = open for any employee to accept).
        assignees: activeMembers.map((m) => ({ id: m.user.id, name: m.user.name })),
        status: toFrontendStatus(p.status, p.deadline, p.progressPercent),
        due: fmtDate(p.deadline),
        progress: p.progressPercent,
        description: p.description ?? "",
    };
}
const PROJECT_INCLUDE = {
    creator: { select: { name: true } },
    members: { where: { deletedAt: null }, include: { user: { select: { id: true, name: true } } } },
};
// Adds/removes ProjectMember rows so the project's assignee list matches
// `assigneeIds` exactly. Restores a previously soft-deleted membership
// instead of inserting a duplicate row (the [projectId, userId] pair is
// unique, soft-deleted or not).
async function syncProjectMembers(projectId, assigneeIds) {
    const desired = new Set(assigneeIds);
    const existingRows = await client_1.default.projectMember.findMany({ where: { projectId } });
    const activeUserIds = new Set(existingRows.filter((m) => !m.deletedAt).map((m) => m.userId));
    const existingByUserId = new Map(existingRows.map((m) => [m.userId, m]));
    // Remove anyone no longer desired.
    for (const row of existingRows) {
        if (!row.deletedAt && !desired.has(row.userId)) {
            await client_1.default.projectMember.update({ where: { id: row.id }, data: { deletedAt: new Date() } });
        }
    }
    // Add anyone newly desired.
    for (const userId of desired) {
        if (activeUserIds.has(userId))
            continue;
        const existingRow = existingByUserId.get(userId);
        if (existingRow) {
            await client_1.default.projectMember.update({ where: { id: existingRow.id }, data: { deletedAt: null } });
        }
        else {
            await client_1.default.projectMember.create({ data: { projectId, userId, roleInProject: 'member' } });
        }
    }
}
class ProjectController {
    listProjects = async (_req, res) => {
        const projects = await client_1.default.project.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            include: PROJECT_INCLUDE,
        });
        return res.json(projects.map(toListJSON));
    };
    getProject = async (req, res) => {
        const id = String(req.params.id);
        const project = await client_1.default.project.findFirst({
            where: { id, deletedAt: null },
            include: {
                ...PROJECT_INCLUDE,
                files: { select: { fileType: true, sizeKb: true } },
            },
        });
        if (!project)
            return res.status(404).json({ message: "Project not found" });
        const counts = { image: 0, pdf: 0, doc: 0, video: 0, other: 0 };
        let totalKb = 0;
        for (const f of project.files) {
            counts[f.fileType]++;
            totalKb += f.sizeKb ?? 0;
        }
        return res.json({
            ...toListJSON(project),
            media: {
                usedGB: Number((totalKb / 1_000_000).toFixed(2)),
                totalGB: 10,
                fileCount: project.files.length,
                images: counts.image,
                docs: counts.pdf + counts.doc,
                videos: counts.video,
            },
        });
    };
    createProject = async (req, res) => {
        const { name, client, status, due, progress, description, assigneeIds } = req.body;
        if (!name?.trim())
            return res.status(400).json({ message: "Project name is required" });
        const project = await client_1.default.project.create({
            data: {
                name,
                client,
                description,
                status: toPrismaStatus(status),
                progressPercent: Math.min(100, Math.max(0, progress ?? 0)),
                deadline: due ? new Date(due) : null,
                createdById: req.user.id,
                createdBy: req.user.id,
            },
        });
        // Leaving assigneeIds empty is intentional, not an oversight — it's how
        // an admin posts an "open" project that shows up on every employee's
        // dashboard for anyone to accept.
        if (Array.isArray(assigneeIds) && assigneeIds.length > 0) {
            await syncProjectMembers(project.id, assigneeIds);
        }
        await client_1.default.activityLog.create({
            data: {
                userId: req.user.id,
                actionType: 'project_created',
                description: `created project "${project.name}"${assigneeIds?.length ? '' : ' (unassigned — open for any employee to accept)'}`,
                relatedId: project.id,
                relatedType: 'Project',
            },
        });
        const withMembers = await client_1.default.project.findFirst({ where: { id: project.id }, include: PROJECT_INCLUDE });
        return res.status(201).json(toListJSON(withMembers));
    };
    updateProject = async (req, res) => {
        const id = String(req.params.id);
        const { name, client, status, due, progress, description, assigneeIds } = req.body;
        const existing = await client_1.default.project.findFirst({ where: { id, deletedAt: null } });
        if (!existing)
            return res.status(404).json({ message: "Project not found" });
        const project = await client_1.default.project.update({
            where: { id },
            data: {
                ...(name !== undefined && { name }),
                ...(client !== undefined && { client }),
                ...(description !== undefined && { description }),
                ...(status !== undefined && { status: toPrismaStatus(status) }),
                ...(progress !== undefined && { progressPercent: Math.min(100, Math.max(0, progress)) }),
                ...(due !== undefined && { deadline: due ? new Date(due) : null }),
                updatedBy: req.user.id,
            },
        });
        if (Array.isArray(assigneeIds)) {
            await syncProjectMembers(id, assigneeIds);
        }
        await client_1.default.activityLog.create({
            data: {
                userId: req.user.id,
                actionType: 'project_updated',
                description: `updated project "${project.name}"`,
                relatedId: project.id,
                relatedType: 'Project',
            },
        });
        const withMembers = await client_1.default.project.findFirst({ where: { id }, include: PROJECT_INCLUDE });
        return res.json(toListJSON(withMembers));
    };
    deleteProject = async (req, res) => {
        const id = String(req.params.id);
        const existing = await client_1.default.project.findFirst({ where: { id, deletedAt: null } });
        if (!existing)
            return res.status(404).json({ message: "Project not found" });
        await client_1.default.project.update({
            where: { id },
            data: { deletedAt: new Date(), deletedBy: req.user.id },
        });
        return res.status(204).send();
    };
    // ── Open (unassigned) projects — surfaced on every employee's dashboard ──
    listOpenProjects = async (_req, res) => {
        const projects = await client_1.default.project.findMany({
            where: {
                deletedAt: null,
                status: { not: 'completed' },
                members: { none: { deletedAt: null } },
            },
            orderBy: { createdAt: 'desc' },
            include: PROJECT_INCLUDE,
        });
        return res.json(projects.map(toListJSON));
    };
    // An employee claims an open project — first to accept gets it. Deferred:
    // the reward for accepting (mentioned by the product owner) isn't wired up
    // yet; this just performs the assignment + activity log.
    acceptProject = async (req, res) => {
        const id = String(req.params.id);
        const userId = req.user.id;
        const project = await client_1.default.project.findFirst({
            where: { id, deletedAt: null },
            include: { members: { where: { deletedAt: null } } },
        });
        if (!project)
            return res.status(404).json({ message: "Project not found" });
        if (project.members.length > 0) {
            return res.status(409).json({ message: "This project has already been claimed by someone else." });
        }
        await syncProjectMembers(id, [userId]);
        await client_1.default.activityLog.create({
            data: {
                userId,
                actionType: 'project_updated',
                description: `${req.user.name} accepted project "${project.name}"`,
                relatedId: project.id,
                relatedType: 'Project',
            },
        });
        // TODO(reward system): grant the accepting employee a reward here once
        // the rewards module is wired up — this is the single place that should
        // trigger it.
        const withMembers = await client_1.default.project.findFirst({ where: { id }, include: PROJECT_INCLUDE });
        return res.status(200).json(toListJSON(withMembers));
    };
}
exports.ProjectController = ProjectController;
