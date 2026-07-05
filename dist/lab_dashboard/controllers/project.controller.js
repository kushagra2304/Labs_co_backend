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
    return {
        id: p.id,
        name: p.name,
        client: p.client ?? "",
        supervisor: p.creator?.name ?? "",
        members: p.members?.length ?? 0,
        status: toFrontendStatus(p.status, p.deadline, p.progressPercent),
        due: fmtDate(p.deadline),
        progress: p.progressPercent,
        description: p.description ?? "",
    };
}
class ProjectController {
    listProjects = async (req, res) => {
        const projects = await client_1.default.project.findMany({
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            include: { creator: { select: { name: true } }, members: { select: { id: true } } },
        });
        res.json(projects.map(toListJSON));
    };
    getProject = async (req, res) => {
        const id = String(req.params.id);
        const project = await client_1.default.project.findFirst({
            where: { id, deletedAt: null },
            include: {
                creator: { select: { name: true } },
                members: { select: { id: true } },
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
        res.json({
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
        const { name, client, status, due, progress, description } = req.body;
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
            include: { creator: { select: { name: true } }, members: true },
        });
        res.status(201).json(toListJSON(project));
    };
    updateProject = async (req, res) => {
        const id = String(req.params.id);
        const { name, client, status, due, progress, description } = req.body;
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
            include: { creator: { select: { name: true } }, members: true },
        });
        res.json(toListJSON(project));
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
        res.status(204).send();
    };
}
exports.ProjectController = ProjectController;
