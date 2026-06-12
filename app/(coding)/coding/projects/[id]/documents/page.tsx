"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import {
  FileTextIcon,
  UploadCloudIcon,
  ArrowLeftIcon,
  RefreshCwIcon,
  AlertCircleIcon,
  Loader2Icon,
  FileIcon,
  DatabaseIcon,
  CalendarIcon,
  CheckIcon,
} from "lucide-react";
import {
  getProject,
  getDataRepo,
  listDataRepoDocuments,
  uploadDocument,
  Project,
  DataRepo,
  DataRepoDocument,
} from "@/lib/projects-api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DocumentManagerPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params.id as string;

  const [project, setProject] = React.useState<Project | null>(null);
  const [repo, setRepo] = React.useState<DataRepo | null>(null);
  const [documents, setDocuments] = React.useState<DataRepoDocument[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [uploading, setUploading] = React.useState(false);
  const [dragActive, setDragActive] = React.useState(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const loadData = React.useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Project
      const projRes = await getProject(projectId);
      const proj = projRes.data.data;
      setProject(proj);

      // 2. Fetch Repo & Documents if repo exists
      if (proj.dataRepoId) {
        const repoRes = await getDataRepo(proj.dataRepoId);
        setRepo(repoRes.data.data);

        const docsRes = await listDataRepoDocuments(proj.dataRepoId);
        setDocuments(docsRes.data.data);
      } else {
        toast.warning("No knowledge repository associated with this project.");
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Failed to load project details");
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  React.useEffect(() => {
    const timer = setTimeout(() => {
      loadData();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadData]);

  // Handle Drag & Drop Events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      await handleUploadFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      await handleUploadFiles(e.target.files);
    }
  };

  const handleUploadFiles = async (files: FileList) => {
    if (!project?.dataRepoId) {
      toast.error("No knowledge repository linked to this project.");
      return;
    }

    setUploading(true);
    let successCount = 0;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        await uploadDocument(project.dataRepoId, file);
        successCount++;
      } catch (err: any) {
        // Handle duplicate or standard error message
        const errMsg = err?.response?.data?.message || `Failed to upload "${file.name}"`;
        toast.error(errMsg);
      }
    }

    if (successCount > 0) {
      toast.success(`Successfully uploaded ${successCount} document(s)`);
      // Refresh documents
      try {
        const docsRes = await listDataRepoDocuments(project.dataRepoId);
        setDocuments(docsRes.data.data);
        
        // Refresh repo metadata (e.g. pages count)
        const repoRes = await getDataRepo(project.dataRepoId);
        setRepo(repoRes.data.data);
      } catch (err) {
        console.error("Failed to refresh document list", err);
      }
    }
    setUploading(false);
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getRepoStatusStyles = (status?: string) => {
    switch (status) {
      case "active":
        return {
          bg: "bg-emerald-500/10 border-emerald-500/20 text-emerald-500",
          dot: "bg-emerald-500",
          label: "Active / Synced",
        };
      case "building":
        return {
          bg: "bg-orange-500/10 border-orange-500/20 text-orange-500",
          dot: "bg-orange-500 animate-pulse",
          label: "Building Index",
        };
      case "error":
        return {
          bg: "bg-rose-500/10 border-rose-500/20 text-rose-500",
          dot: "bg-rose-500",
          label: "Sync Error",
        };
      default:
        return {
          bg: "bg-muted border-border/40 text-muted-foreground",
          dot: "bg-muted-foreground",
          label: "Unknown",
        };
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3">
        <Loader2Icon className="size-8 animate-spin text-orange-500" />
        <p className="text-sm text-muted-foreground font-medium">Loading Document Manager...</p>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center space-y-4">
        <AlertCircleIcon className="size-10 text-rose-500" />
        <div>
          <h2 className="text-lg font-bold text-foreground">Project not found</h2>
          <p className="text-sm text-muted-foreground mt-1">This workspace project does not exist or has been deleted.</p>
        </div>
        <Button onClick={() => router.push("/coding/projects")} variant="outline" className="rounded-xl">
          Back to Hub
        </Button>
      </div>
    );
  }

  const statusInfo = getRepoStatusStyles(repo?.status);

  return (
    <div className="flex-1 flex flex-col p-6 space-y-6 max-w-5xl mx-auto w-full animate-in fade-in duration-300">
      
      {/* Navigation Breadcrumb Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            onClick={() => router.push("/coding/projects")}
            variant="ghost"
            className="size-9 rounded-xl border border-border/40 hover:bg-muted/40 flex items-center justify-center shrink-0"
          >
            <ArrowLeftIcon className="size-4 text-muted-foreground" />
          </Button>
          <div className="leading-tight">
            <div className="flex items-center gap-2 text-xs text-muted-foreground font-medium uppercase tracking-wider">
              <span>Projects</span>
              <span>/</span>
              <span className="max-w-[120px] truncate">{project.name}</span>
              <span>/</span>
              <span className="text-foreground">Documents</span>
            </div>
            <h1 className="text-2xl font-black text-foreground tracking-tight mt-0.5">
              Knowledge Repository
            </h1>
          </div>
        </div>

        <Button
          onClick={loadData}
          variant="outline"
          className="size-9 rounded-xl border border-border/40 hover:bg-muted/40 flex items-center justify-center shrink-0"
          title="Refresh document details"
        >
          <RefreshCwIcon className="size-4 text-muted-foreground" />
        </Button>
      </div>

      {/* Repo Stats Row */}
      {repo && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          
          {/* Status */}
          <div className="p-5 rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">
                Index Status
              </span>
              <div className="flex items-center gap-2">
                <span className={cn("size-2 rounded-full", statusInfo.dot)} />
                <span className="text-sm font-bold text-foreground">{statusInfo.label}</span>
              </div>
            </div>
            <div className={cn("px-3 py-1 rounded-full text-xs font-bold border", statusInfo.bg)}>
              {repo.status}
            </div>
          </div>

          {/* Document Pages Count */}
          <div className="p-5 rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">
                Processed Pages
              </span>
              <p className="text-xl font-extrabold text-foreground">{repo.page_count ?? 0}</p>
            </div>
            <div className="p-2.5 bg-blue-500/10 text-blue-500 border border-blue-500/20 rounded-xl">
              <DatabaseIcon className="size-5" />
            </div>
          </div>

          {/* Document Count */}
          <div className="p-5 rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm shadow-sm flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/80">
                Total Files
              </span>
              <p className="text-xl font-extrabold text-foreground">{documents.length}</p>
            </div>
            <div className="p-2.5 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-xl">
              <FileTextIcon className="size-5" />
            </div>
          </div>
        </div>
      )}

      {/* Main Upload and Listing Panel */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Upload Zone */}
        <div className="md:col-span-1 space-y-4">
          <div className="p-5 rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm shadow-sm space-y-4">
            <h3 className="text-sm font-extrabold tracking-tight">Upload Documents</h3>
            <p className="text-xs text-muted-foreground leading-normal">
              Feed manuals, business requirement spec sheets, plans, or design files directly into the project&apos;s semantic knowledge index.
            </p>

            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
              className={cn(
                "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 min-h-[160px]",
                dragActive
                  ? "border-orange-500 bg-orange-500/5 scale-[0.98]"
                  : "border-border/60 hover:border-border hover:bg-muted/20"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                accept=".pdf,.txt,.md,.doc,.docx"
              />
              
              {uploading ? (
                <div className="space-y-2 flex flex-col items-center">
                  <Loader2Icon className="size-6 animate-spin text-orange-500" />
                  <span className="text-xs font-semibold text-muted-foreground">Uploading files...</span>
                </div>
              ) : (
                <div className="space-y-2 flex flex-col items-center">
                  <UploadCloudIcon className="size-6 text-muted-foreground/80 group-hover:text-orange-500 transition-colors" />
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-foreground">Click to upload</p>
                    <p className="text-[10px] text-muted-foreground">or drag & drop here</p>
                  </div>
                  <p className="text-[9px] text-muted-foreground/60 uppercase font-semibold">
                    PDF, TXT, MD, DOCX
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Documents Listing */}
        <div className="md:col-span-2 space-y-4">
          <div className="p-6 rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold tracking-tight">Index Files</h3>
              <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground/60">
                Sorted by Upload date
              </span>
            </div>

            {documents.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 border border-dashed border-border/40 rounded-xl text-center space-y-3">
                <div className="p-3 bg-muted/40 rounded-full border border-border/40 text-muted-foreground">
                  <FileIcon className="size-6" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-bold text-foreground">No documents uploaded yet</p>
                  <p className="text-[11px] text-muted-foreground">Upload files on the left panel to populate knowledge.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-3 max-h-[450px] overflow-y-auto pr-1">
                {documents.map((doc) => {
                  const uploadDate = doc.uploaded_at
                    ? new Date(doc.uploaded_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })
                    : "Unknown date";

                  return (
                    <div
                      key={doc.id}
                      className="flex items-center justify-between p-4 rounded-xl border border-border/40 bg-background/50 hover:bg-muted/10 hover:border-border/80 transition-all duration-150"
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-4">
                        <div className="p-2 bg-orange-500/10 text-orange-500 border border-orange-500/20 rounded-lg shrink-0">
                          <FileIcon className="size-4" />
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <p className="text-xs font-bold text-foreground truncate">{doc.filename}</p>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                            <CalendarIcon className="size-3 shrink-0" />
                            <span>{uploadDate}</span>
                          </div>
                        </div>
                      </div>

                      {/* Status indicator */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                          {doc.status}
                        </span>
                        {doc.status === "completed" ? (
                          <div className="p-0.5 bg-emerald-500 text-white rounded-full">
                            <CheckIcon className="size-3" />
                          </div>
                        ) : doc.status === "processing" || doc.status === "queued" ? (
                          <Loader2Icon className="size-3.5 animate-spin text-orange-500" />
                        ) : (
                          <div className="p-0.5 bg-rose-500 text-white rounded-full">
                            <AlertCircleIcon className="size-3" />
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
