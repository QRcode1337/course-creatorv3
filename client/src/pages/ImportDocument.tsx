import { useState, useCallback, useRef } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import Header from "@/components/Header";
import {
  Upload,
  FileText,
  File,
  FileType,
  Loader2,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Clock,
  ArrowRight,
  BookOpen,
  RefreshCw,
} from "lucide-react";

type FileType = "pdf" | "docx" | "txt" | "md";

interface UploadingFile {
  file: File;
  progress: number;
  status: "uploading" | "processing" | "ready" | "error";
  error?: string;
  documentId?: number;
}

export default function ImportDocument() {
  const { user, loading: authLoading, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uploadingFiles, setUploadingFiles] = useState<UploadingFile[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<number[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Course generation options
  const [approach, setApproach] = useState<"balanced" | "rigorous" | "easy">("balanced");
  const [courseLength, setCourseLength] = useState<"short" | "medium" | "comprehensive">("medium");
  const [lessonsPerChapter, setLessonsPerChapter] = useState<"few" | "moderate" | "many">("moderate");
  const [contentDepth, setContentDepth] = useState<"introductory" | "intermediate" | "advanced">("intermediate");

  // Fetch user's documents
  const { data: documents, refetch: refetchDocuments } = trpc.document.list.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 5000, // Poll for status updates
  });

  const uploadMutation = trpc.document.upload.useMutation({
    onSuccess: (data, variables) => {
      setUploadingFiles(prev => 
        prev.map(f => 
          f.file.name === variables.fileName 
            ? { ...f, status: "processing" as const, documentId: data.documentId, progress: 100 }
            : f
        )
      );
      refetchDocuments();
    },
    onError: (error, variables) => {
      setUploadingFiles(prev =>
        prev.map(f =>
          f.file.name === variables.fileName
            ? { ...f, status: "error" as const, error: error.message }
            : f
        )
      );
    },
  });

  const deleteMutation = trpc.document.delete.useMutation({
    onSuccess: () => {
      refetchDocuments();
      toast.success("Document deleted");
    },
  });

  const generateCourseMutation = trpc.document.generateCourse.useMutation({
    onSuccess: (data) => {
      toast.success("Course generated successfully!");
      navigate(`/course/${data.courseId}`);
    },
    onError: (error) => {
      toast.error(error.message);
      setIsGenerating(false);
    },
  });

  const getFileType = (fileName: string): FileType | null => {
    const ext = fileName.toLowerCase().split(".").pop();
    switch (ext) {
      case "pdf": return "pdf";
      case "docx": return "docx";
      case "txt": return "txt";
      case "md":
      case "markdown": return "md";
      default: return null;
    }
  };

  const getMimeType = (fileType: FileType): string => {
    switch (fileType) {
      case "pdf": return "application/pdf";
      case "docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      case "txt": return "text/plain";
      case "md": return "text/markdown";
    }
  };

  const uploadFile = async (file: File) => {
    const fileType = getFileType(file.name);
    if (!fileType) {
      toast.error(`Unsupported file type: ${file.name}`);
      return;
    }

    // Add to uploading files
    setUploadingFiles(prev => [...prev, { file, progress: 0, status: "uploading" }]);

    try {
      // Upload to S3 via fetch
      const formData = new FormData();
      formData.append("file", file);

      // Generate a unique key for the file
      const timestamp = Date.now();
      const randomSuffix = Math.random().toString(36).substring(2, 8);
      const fileKey = `documents/${timestamp}-${randomSuffix}-${file.name}`;

      // Use the storage API
      const uploadResponse = await fetch(`/api/upload`, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file");
      }

      const { url, key } = await uploadResponse.json();

      // Update progress
      setUploadingFiles(prev =>
        prev.map(f => (f.file.name === file.name ? { ...f, progress: 50 } : f))
      );

      // Register document in database
      await uploadMutation.mutateAsync({
        fileName: file.name,
        fileType,
        fileUrl: url,
        fileKey: key,
        fileSize: file.size,
      });
    } catch (error) {
      setUploadingFiles(prev =>
        prev.map(f =>
          f.file.name === file.name
            ? { ...f, status: "error", error: error instanceof Error ? error.message : "Upload failed" }
            : f
        )
      );
    }
  };

  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return;
    Array.from(files).forEach(uploadFile);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelect(e.dataTransfer.files);
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const toggleDocumentSelection = (docId: number) => {
    setSelectedDocuments(prev =>
      prev.includes(docId)
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleGenerateCourse = async () => {
    if (selectedDocuments.length === 0) {
      toast.error("Please select at least one document");
      return;
    }

    setIsGenerating(true);
    generateCourseMutation.mutate({
      documentIds: selectedDocuments,
      approach,
      courseLength,
      lessonsPerChapter,
      contentDepth,
    });
  };

  const getFileIcon = (fileType: string) => {
    switch (fileType) {
      case "pdf": return <FileText className="h-5 w-5 text-red-500" />;
      case "docx": return <FileType className="h-5 w-5 text-blue-500" />;
      case "txt": return <File className="h-5 w-5 text-gray-500" />;
      case "md": return <FileText className="h-5 w-5 text-purple-500" />;
      default: return <File className="h-5 w-5" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "uploading":
        return <Badge variant="secondary"><Loader2 className="h-3 w-3 mr-1 animate-spin" />Uploading</Badge>;
      case "processing":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Processing</Badge>;
      case "ready":
        return <Badge className="bg-green-500"><CheckCircle2 className="h-3 w-3 mr-1" />Ready</Badge>;
      case "error":
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Error</Badge>;
      default:
        return null;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const readyDocuments = documents?.filter(d => d.status === "ready") || [];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center">
          <Card className="max-w-md">
            <CardHeader>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                Please sign in to import documents and create courses.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <a href={getLoginUrl()}>Sign In</a>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      <Header />
      
      <main className="flex-1 container py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold">Import Documents</h1>
            <p className="text-muted-foreground">
              Upload your documents and let AI transform them into comprehensive courses
            </p>
          </div>

          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Documents
              </CardTitle>
              <CardDescription>
                Supported formats: PDF, Word (.docx), Text (.txt), Markdown (.md)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragging
                    ? "border-primary bg-primary/5"
                    : "border-muted-foreground/25 hover:border-primary/50"
                }`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.txt,.md,.markdown"
                  multiple
                  onChange={(e) => handleFileSelect(e.target.files)}
                />
                <Upload className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-lg font-medium">
                  {isDragging ? "Drop files here" : "Drag & drop files here"}
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  or click to browse
                </p>
              </div>

              {/* Uploading Files */}
              {uploadingFiles.length > 0 && (
                <div className="mt-4 space-y-2">
                  {uploadingFiles.map((uf, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                      {getFileIcon(getFileType(uf.file.name) || "txt")}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{uf.file.name}</p>
                        {uf.status === "uploading" && (
                          <Progress value={uf.progress} className="h-1 mt-1" />
                        )}
                        {uf.error && (
                          <p className="text-xs text-destructive mt-1">{uf.error}</p>
                        )}
                      </div>
                      {getStatusBadge(uf.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Document List */}
          {documents && documents.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <FileText className="h-5 w-5" />
                      Your Documents
                    </CardTitle>
                    <CardDescription>
                      Select documents to generate a course from
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => refetchDocuments()}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {documents.map((doc) => (
                    <div
                      key={doc.id}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        selectedDocuments.includes(doc.id)
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/50 hover:bg-muted"
                      }`}
                    >
                      {doc.status === "ready" && (
                        <Checkbox
                          checked={selectedDocuments.includes(doc.id)}
                          onCheckedChange={() => toggleDocumentSelection(doc.id)}
                        />
                      )}
                      {getFileIcon(doc.fileType)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{doc.fileName}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatFileSize(doc.fileSize)} • Uploaded {new Date(doc.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      {getStatusBadge(doc.status)}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => deleteMutation.mutate({ id: doc.id })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Course Generation Options */}
          {readyDocuments.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Generate Course
                </CardTitle>
                <CardDescription>
                  Configure how the AI should transform your documents into a course
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Teaching Approach</Label>
                    <Select value={approach} onValueChange={(v: any) => setApproach(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="rigorous">Rigorous Academic</SelectItem>
                        <SelectItem value="easy">Easily Explained</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Course Length</Label>
                    <Select value={courseLength} onValueChange={(v: any) => setCourseLength(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="short">Short (3-5 chapters)</SelectItem>
                        <SelectItem value="medium">Medium (6-10 chapters)</SelectItem>
                        <SelectItem value="comprehensive">Comprehensive (11-15 chapters)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Lessons per Chapter</Label>
                    <Select value={lessonsPerChapter} onValueChange={(v: any) => setLessonsPerChapter(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="few">Few (2-3 lessons)</SelectItem>
                        <SelectItem value="moderate">Moderate (4-6 lessons)</SelectItem>
                        <SelectItem value="many">Many (7-10 lessons)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Content Depth</Label>
                    <Select value={contentDepth} onValueChange={(v: any) => setContentDepth(v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="introductory">Introductory</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="advanced">Advanced</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {selectedDocuments.length} document{selectedDocuments.length !== 1 ? "s" : ""} selected
                  </p>
                  <Button
                    onClick={handleGenerateCourse}
                    disabled={selectedDocuments.length === 0 || isGenerating}
                    className="gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Generating Course...
                      </>
                    ) : (
                      <>
                        <BookOpen className="h-4 w-4" />
                        Generate Course
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
