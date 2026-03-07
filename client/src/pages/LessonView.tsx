import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import { trpc } from "@/lib/trpc";
import { Link, useParams, useLocation } from "wouter";
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Download,
  HelpCircle,
  Image as ImageIcon,
  Layers,
  Lightbulb,
  Loader2,
  MessageCircle,
  NotebookPen,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Send,
  Sparkles,
  Trash2,
  X,
  Zap,
} from "lucide-react";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function LessonView() {
  const { id } = useParams<{ id: string }>();
  const lessonId = parseInt(id || "0");
  const { user } = useAuth();
  const [, navigate] = useLocation();

  const [notes, setNotes] = useState("");
  const [notesSaved, setNotesSaved] = useState(true);
  const [activeTab, setActiveTab] = useState("content");

  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState<Record<number, string>>({});
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [quizFeedback, setQuizFeedback] = useState<{ questionIndex: number; score: number; feedback: string }[]>([]);

  // Media generation state
  const [mediaDialogOpen, setMediaDialogOpen] = useState(false);
  const [mediaType, setMediaType] = useState<"illustration" | "infographic" | "data_visualization" | "diagram">("illustration");
  const [visualStyle, setVisualStyle] = useState<"minimalist" | "detailed" | "colorful" | "technical" | "modern">("modern");
  const [customPrompt, setCustomPrompt] = useState("");

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const { data: lesson, isLoading, refetch: refetchLesson } = trpc.lesson.get.useQuery(
    { id: lessonId },
    { enabled: lessonId > 0 }
  );

  const { data: course } = trpc.course.get.useQuery(
    { id: lesson?.courseId || 0 },
    { enabled: !!lesson?.courseId }
  );

  const { data: userNote } = trpc.notes.get.useQuery(
    { lessonId },
    { enabled: lessonId > 0 && !!user }
  );

  const { data: quiz } = trpc.quiz.get.useQuery(
    { lessonId },
    { enabled: lessonId > 0 }
  );

  const { data: quizResults } = trpc.quiz.getResults.useQuery(
    { lessonId },
    { enabled: lessonId > 0 && !!user }
  );

  const { data: flashcards } = trpc.flashcard.getByCourse.useQuery(
    { courseId: lesson?.courseId || 0 },
    { enabled: !!lesson?.courseId && !!user }
  );

  // Set notes from database
  useEffect(() => {
    if (userNote?.content) {
      setNotes(userNote.content);
      setNotesSaved(true);
    }
  }, [userNote]);

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const saveNotes = trpc.notes.save.useMutation({
    onSuccess: () => {
      setNotesSaved(true);
      toast.success("Notes saved");
    },
  });

  const generateQuiz = trpc.quiz.generate.useMutation({
    onSuccess: () => {
      toast.success("Quiz generated!");
    },
  });

  const submitQuiz = trpc.quiz.submit.useMutation({
    onSuccess: (data) => {
      setQuizSubmitted(true);
      setQuizFeedback(data.feedback);
      toast.success(`Quiz submitted! Score: ${Math.round(data.score)}%`);
    },
  });

  const generateFlashcards = trpc.flashcard.generate.useMutation({
    onSuccess: () => {
      toast.success("Flashcards generated!");
    },
  });

  const markComplete = trpc.lesson.markComplete.useMutation({
    onSuccess: () => {
      toast.success("Lesson marked as complete!");
    },
  });

  const regenerateLesson = trpc.lesson.regenerate.useMutation({
    onSuccess: () => {
      refetchLesson();
      toast.success("Lesson regenerated!");
    },
  });

  const generateMedia = trpc.illustration.generate.useMutation({
    onSuccess: () => {
      refetchLesson();
      setMediaDialogOpen(false);
      toast.success("Media generated!");
    },
  });

  const deleteIllustration = trpc.illustration.delete.useMutation({
    onSuccess: () => {
      refetchLesson();
      toast.success("Illustration deleted");
    },
  });

  const aiChat = trpc.aiChat.chat.useMutation({
    onSuccess: (data) => {
      setChatMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    },
    onError: () => {
      toast.error("Failed to get response");
    },
  });

  const exportPdf = trpc.lesson.exportPdf.useMutation({
    onSuccess: (data) => {
      // Convert base64 to blob and download
      const byteCharacters = atob(data.pdf);
      const byteNumbers = new Array(byteCharacters.length);
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
      }
      const byteArray = new Uint8Array(byteNumbers);
      const blob = new Blob([byteArray], { type: 'application/pdf' });
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = data.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("PDF downloaded!");
    },
    onError: () => {
      toast.error("Failed to generate PDF");
    },
  });

  // Auto-save notes
  useEffect(() => {
    if (!notesSaved && notes && user) {
      const timer = setTimeout(() => {
        saveNotes.mutate({ lessonId, courseId: lesson?.courseId || 0, content: notes });
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [notes, notesSaved, lessonId, user]);

  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
    setNotesSaved(false);
  }, []);

  const handleSendChatMessage = useCallback((message: string) => {
    if (!message.trim() || !lesson) return;
    
    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", content: message }];
    setChatMessages(newMessages);
    setChatInput("");
    
    aiChat.mutate({
      lessonId,
      messages: newMessages.map(m => ({ role: m.role, content: m.content })),
    });
  }, [chatMessages, lessonId, lesson, aiChat]);

  const handleSaveToNotes = useCallback((content: string) => {
    const newNotes = notes ? `${notes}\n\n---\n\n**AI Tutor Response:**\n${content}` : `**AI Tutor Response:**\n${content}`;
    setNotes(newNotes);
    setNotesSaved(false);
    setActiveTab("notes");
    toast.success("Response added to notes");
  }, [notes]);

  // Suggestion buttons for AI chat
  const chatSuggestions = [
    { icon: Lightbulb, label: "Explain simply", prompt: "Explain this lesson in simpler terms, as if I'm a complete beginner." },
    { icon: Zap, label: "Give examples", prompt: "Give me 3 real-world examples that illustrate the main concepts in this lesson." },
    { icon: HelpCircle, label: "Quiz me", prompt: "Create 3 quick questions to test my understanding of this lesson." },
    { icon: BookOpen, label: "Summarize", prompt: "Summarize the key points of this lesson in bullet points." },
  ];

  // Find current chapter and lesson index
  const currentChapter = useMemo(() => {
    if (!course?.chapters || !lesson) return null;
    return course.chapters.find(ch => ch.id === lesson.chapterId);
  }, [course, lesson]);

  const currentLessonIndex = useMemo(() => {
    if (!currentChapter) return 0;
    return currentChapter.lessons.findIndex(l => l.id === lessonId);
  }, [currentChapter, lessonId]);

  // Navigation
  const allLessons = useMemo(() => {
    if (!course?.chapters) return [];
    return course.chapters.flatMap(ch => ch.lessons);
  }, [course]);

  const currentGlobalIndex = allLessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentGlobalIndex > 0 ? allLessons[currentGlobalIndex - 1] : null;
  const nextLesson = currentGlobalIndex < allLessons.length - 1 ? allLessons[currentGlobalIndex + 1] : null;

  // Flashcard count for this lesson
  const lessonFlashcardCount = useMemo(() => {
    if (!flashcards) return 0;
    return flashcards.filter(f => f.lessonId === lessonId).length;
  }, [flashcards, lessonId]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-24 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">Lesson not found</h1>
          <Link href="/library">
            <Button>Back to Library</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user && course && course.userId === user.id;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href={`/course/${lesson.courseId}`} className="hover:text-foreground">
            {course?.title || "Course"}
          </Link>
          <ChevronRight className="w-4 h-4" />
          <span>{currentChapter?.title || "Chapter"}</span>
          <ChevronRight className="w-4 h-4" />
          <span className="text-foreground">{lesson.title}</span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main content - Left side */}
          <div className="xl:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl">{lesson.title}</CardTitle>
                    <CardDescription className="mt-2">
                      Chapter {(course?.chapters.findIndex(ch => ch.id === lesson.chapterId) ?? 0) + 1}, 
                      Lesson {currentLessonIndex + 1}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => exportPdf.mutate({ lessonId })}
                      disabled={exportPdf.isPending}
                      className="gap-2"
                    >
                      {exportPdf.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Download className="w-4 h-4" />
                      )}
                      Export PDF
                    </Button>
                    {isOwner && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => regenerateLesson.mutate({ lessonId })}
                        disabled={regenerateLesson.isPending}
                        className="gap-2"
                      >
                        {regenerateLesson.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <RefreshCw className="w-4 h-4" />
                        )}
                        Regenerate
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-6">
                    <TabsTrigger value="content" className="gap-2">
                      <BookOpen className="w-4 h-4" />
                      Content
                    </TabsTrigger>
                    <TabsTrigger value="notes" className="gap-2">
                      <NotebookPen className="w-4 h-4" />
                      Notes
                      {!notesSaved && <span className="w-2 h-2 rounded-full bg-amber-500" />}
                    </TabsTrigger>
                    <TabsTrigger value="quiz" className="gap-2">
                      <Sparkles className="w-4 h-4" />
                      Quiz
                      {quizResults && quizResults.length > 0 && (
                        <Badge variant="secondary" className="ml-1">
                          {Math.round(quizResults[0].score)}%
                        </Badge>
                      )}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="content" className="space-y-6">
                    {/* Illustrations - Full size at top */}
                    {lesson.illustrations && lesson.illustrations.length > 0 && (
                      <div className="space-y-4">
                        {lesson.illustrations.map((illustration) => (
                          <div key={illustration.id} className="relative group">
                            <img
                              src={illustration.imageUrl}
                              alt={illustration.caption || "Lesson illustration"}
                              className="w-full rounded-lg border"
                            />
                            {isOwner && (
                              <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => deleteIllustration.mutate({ id: illustration.id })}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                            {illustration.caption && (
                              <p className="text-sm text-muted-foreground mt-2 text-center italic">
                                {illustration.caption}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Lesson content */}
                    <div className="prose prose-slate max-w-none dark:prose-invert">
                      <Streamdown>{lesson.content || "No content available."}</Streamdown>
                    </div>

                    {/* Glossary terms */}
                    {lesson.glossaryTerms && lesson.glossaryTerms.length > 0 && (
                      <Card className="bg-muted/30">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-lg">Key Terms</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {lesson.glossaryTerms.map((term) => (
                              <Tooltip key={term.id}>
                                <TooltipTrigger asChild>
                                  <div className="p-3 rounded-lg bg-background cursor-help border">
                                    <span className="font-medium">{term.term}</span>
                                  </div>
                                </TooltipTrigger>
                                <TooltipContent side="top" className="max-w-xs">
                                  <p>{term.definition || "Definition not available"}</p>
                                </TooltipContent>
                              </Tooltip>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Add More Illustrations Button */}
                    {isOwner && (
                      <div className="flex justify-end">
                        <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="gap-2">
                              <Plus className="w-4 h-4" />
                              Add Illustration
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="sm:max-w-[500px]">
                            <DialogHeader>
                              <DialogTitle>Generate Lesson Media</DialogTitle>
                              <DialogDescription>
                                Create visual content to enhance this lesson
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              <div className="space-y-2">
                                <Label>Media Type</Label>
                                <Select value={mediaType} onValueChange={(v) => setMediaType(v as typeof mediaType)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="illustration">Illustration</SelectItem>
                                    <SelectItem value="infographic">Infographic</SelectItem>
                                    <SelectItem value="data_visualization">Data Visualization</SelectItem>
                                    <SelectItem value="diagram">Diagram</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Visual Style</Label>
                                <Select value={visualStyle} onValueChange={(v) => setVisualStyle(v as typeof visualStyle)}>
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="minimalist">Minimalist</SelectItem>
                                    <SelectItem value="detailed">Detailed</SelectItem>
                                    <SelectItem value="colorful">Colorful</SelectItem>
                                    <SelectItem value="technical">Technical</SelectItem>
                                    <SelectItem value="modern">Modern</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div className="space-y-2">
                                <Label>Custom Prompt (Optional)</Label>
                                <Textarea
                                  placeholder="Describe what you want to visualize..."
                                  value={customPrompt}
                                  onChange={(e) => setCustomPrompt(e.target.value)}
                                />
                              </div>
                              <Button
                                onClick={() => generateMedia.mutate({
                                  lessonId,
                                  courseId: lesson.courseId,
                                  mediaType,
                                  visualStyle,
                                  customPrompt: customPrompt || undefined,
                                })}
                                disabled={generateMedia.isPending}
                                className="w-full gap-2"
                              >
                                {generateMedia.isPending ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Palette className="w-4 h-4" />
                                )}
                                Generate Media
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}

                    {/* Generate first illustration if none exist */}
                    {(!lesson.illustrations || lesson.illustrations.length === 0) && isOwner && (
                      <div className="text-center py-8 border rounded-lg bg-muted/30">
                        <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                        <p className="text-muted-foreground">No illustrations yet</p>
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-3 gap-2"
                          onClick={() => setMediaDialogOpen(true)}
                        >
                          <Plus className="w-4 h-4" />
                          Generate Illustration
                        </Button>
                      </div>
                    )}
                  </TabsContent>

                  <TabsContent value="notes">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">Your Notes</h3>
                          <p className="text-sm text-muted-foreground">
                            Notes auto-save as you type
                          </p>
                        </div>
                        {!notesSaved && (
                          <Badge variant="outline" className="gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Saving...
                          </Badge>
                        )}
                      </div>
                      {user ? (
                        <Textarea
                          placeholder="Take notes on this lesson..."
                          value={notes}
                          onChange={(e) => handleNotesChange(e.target.value)}
                          className="min-h-[400px] resize-none"
                        />
                      ) : (
                        <div className="text-center py-12 border rounded-lg bg-muted/30">
                          <NotebookPen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Sign in to take notes</h3>
                          <p className="text-muted-foreground">
                            Your notes will be saved and synced across devices
                          </p>
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="quiz">
                    {!quiz ? (
                      <div className="text-center py-12 border rounded-lg bg-muted/30">
                        <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No quiz yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Generate a quiz to test your understanding
                        </p>
                        {isOwner && (
                          <Button
                            onClick={() => generateQuiz.mutate({ lessonId, courseId: lesson.courseId })}
                            disabled={generateQuiz.isPending}
                            className="gap-2"
                          >
                            {generateQuiz.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Sparkles className="w-4 h-4" />
                            )}
                            Generate Quiz
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {(quiz.questions as any[]).map((question: any, index: number) => {
                          const feedback = quizFeedback.find(f => f.questionIndex === index);
                          return (
                            <Card key={index} className={feedback ? (feedback.score >= 70 ? "border-green-500" : "border-red-500") : ""}>
                              <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                  <span className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-sm text-primary">
                                    {index + 1}
                                  </span>
                                  {question.question}
                                </CardTitle>
                                <Badge variant="outline">{question.type === "multiple_choice" ? "Multiple Choice" : "Short Answer"}</Badge>
                              </CardHeader>
                              <CardContent>
                                {question.type === "multiple_choice" ? (
                                  <RadioGroup
                                    value={quizAnswers[index] || ""}
                                    onValueChange={(value) => setQuizAnswers(prev => ({ ...prev, [index]: value }))}
                                    disabled={quizSubmitted}
                                  >
                                    {question.options?.map((option: string, optIndex: number) => (
                                      <div key={optIndex} className="flex items-center space-x-2">
                                        <RadioGroupItem value={option} id={`q${index}-opt${optIndex}`} />
                                        <Label htmlFor={`q${index}-opt${optIndex}`}>{option}</Label>
                                      </div>
                                    ))}
                                  </RadioGroup>
                                ) : (
                                  <Textarea
                                    placeholder="Type your answer..."
                                    value={quizAnswers[index] || ""}
                                    onChange={(e) => setQuizAnswers(prev => ({ ...prev, [index]: e.target.value }))}
                                    disabled={quizSubmitted}
                                    className="min-h-[100px]"
                                  />
                                )}
                                {feedback && (
                                  <div className={`mt-4 p-3 rounded-lg ${feedback.score >= 70 ? "bg-green-50 text-green-800 dark:bg-green-950 dark:text-green-200" : "bg-red-50 text-red-800 dark:bg-red-950 dark:text-red-200"}`}>
                                    <p className="font-medium mb-1">
                                      {feedback.score >= 70 ? "Correct!" : "Incorrect"}
                                      {question.type === "short_answer" && ` (Score: ${feedback.score}%)`}
                                    </p>
                                    <p className="text-sm">{feedback.feedback}</p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          );
                        })}
                        {!quizSubmitted && user && (
                          <Button
                            onClick={() => {
                              const answers = Object.entries(quizAnswers).map(([index, answer]) => ({
                                questionIndex: parseInt(index),
                                answer,
                              }));
                              submitQuiz.mutate({
                                quizId: quiz.id,
                                lessonId,
                                answers,
                              });
                            }}
                            disabled={submitQuiz.isPending || Object.keys(quizAnswers).length === 0}
                            className="w-full gap-2"
                          >
                            {submitQuiz.isPending ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                            Submit Quiz
                          </Button>
                        )}
                        {quizSubmitted && (
                          <Button
                            variant="outline"
                            onClick={() => {
                              setQuizSubmitted(false);
                              setQuizAnswers({});
                              setQuizFeedback([]);
                            }}
                            className="w-full"
                          >
                            Retake Quiz
                          </Button>
                        )}
                      </div>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6">
              {prevLesson ? (
                <Link href={`/lesson/${prevLesson.id}`}>
                  <Button variant="outline" className="gap-2">
                    <ArrowLeft className="w-4 h-4" />
                    Previous
                  </Button>
                </Link>
              ) : (
                <div />
              )}
              {user && (
                <Button
                  onClick={() => markComplete.mutate({ lessonId, courseId: lesson.courseId })}
                  disabled={markComplete.isPending}
                  className="gap-2"
                >
                  {markComplete.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4" />
                  )}
                  Mark Complete
                </Button>
              )}
              {nextLesson ? (
                <Link href={`/lesson/${nextLesson.id}`}>
                  <Button variant="outline" className="gap-2">
                    Next
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              ) : (
                <Link href={`/course/${lesson.courseId}`}>
                  <Button variant="outline" className="gap-2">
                    Back to Course
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </Link>
              )}
            </div>
          </div>

          {/* Right Sidebar - AI Tutor Chat */}
          <div className="space-y-6">
            {/* AI Tutor Card */}
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  AI Tutor
                </CardTitle>
                <CardDescription>
                  Ask questions about this lesson
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {user ? (
                  <>
                    {/* Suggestion buttons */}
                    <div className="grid grid-cols-2 gap-2">
                      {chatSuggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outline"
                          size="sm"
                          className="h-auto py-2 px-3 justify-start gap-2 text-left"
                          onClick={() => handleSendChatMessage(suggestion.prompt)}
                          disabled={aiChat.isPending}
                        >
                          <suggestion.icon className="w-4 h-4 shrink-0 text-primary" />
                          <span className="text-xs">{suggestion.label}</span>
                        </Button>
                      ))}
                    </div>

                    {/* Chat messages */}
                    <ScrollArea className="h-[350px] pr-4" ref={chatScrollRef}>
                      <div className="space-y-4">
                        {chatMessages.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            <MessageCircle className="w-10 h-10 mx-auto mb-3 opacity-50" />
                            <p className="text-sm">Click a suggestion or ask your own question!</p>
                          </div>
                        ) : (
                          chatMessages.map((message, index) => (
                            <div
                              key={index}
                              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                              <div
                                className={`max-w-[90%] rounded-lg px-3 py-2 text-sm ${
                                  message.role === "user"
                                    ? "bg-primary text-primary-foreground"
                                    : "bg-muted"
                                }`}
                              >
                                {message.role === "assistant" ? (
                                  <div className="prose prose-sm dark:prose-invert max-w-none">
                                    <Streamdown>{message.content}</Streamdown>
                                  </div>
                                ) : (
                                  message.content
                                )}
                              </div>
                            </div>
                          ))
                        )}
                        {aiChat.isPending && (
                          <div className="flex justify-start">
                            <div className="bg-muted rounded-lg px-3 py-2">
                              <Loader2 className="w-4 h-4 animate-spin" />
                            </div>
                          </div>
                        )}
                      </div>
                    </ScrollArea>

                    {/* Save to notes button */}
                    {chatMessages.filter(m => m.role === "assistant").length > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const lastAssistantMessage = [...chatMessages].reverse().find(m => m.role === "assistant");
                          if (lastAssistantMessage) {
                            handleSaveToNotes(lastAssistantMessage.content);
                          }
                        }}
                        className="w-full gap-2 text-muted-foreground hover:text-foreground"
                      >
                        <Save className="w-4 h-4" />
                        Save last response to notes
                      </Button>
                    )}

                    {/* Chat persistence notice */}
                    <p className="text-xs text-muted-foreground text-center">
                      Chat is session-based and resets when you leave. Save answers to notes to keep them.
                    </p>

                    {/* Chat input */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ask a question..."
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            handleSendChatMessage(chatInput);
                          }
                        }}
                        disabled={aiChat.isPending}
                      />
                      <Button
                        size="icon"
                        onClick={() => handleSendChatMessage(chatInput)}
                        disabled={aiChat.isPending || !chatInput.trim()}
                      >
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                    <p className="text-sm text-muted-foreground mb-3">
                      Sign in to chat with AI Tutor
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Flashcards */}
            {user && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    Flashcards
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {lessonFlashcardCount} flashcards for this lesson
                  </p>
                  {lessonFlashcardCount === 0 && lesson.glossaryTerms && lesson.glossaryTerms.length > 0 && (
                    <Button
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => generateFlashcards.mutate({ lessonId, courseId: lesson.courseId })}
                      disabled={generateFlashcards.isPending}
                    >
                      {generateFlashcards.isPending ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Sparkles className="w-4 h-4" />
                      )}
                      Generate Flashcards
                    </Button>
                  )}
                  {lessonFlashcardCount > 0 && (
                    <Link href={`/flashcards?lessonId=${lessonId}`}>
                      <Button variant="outline" className="w-full gap-2">
                        <Layers className="w-4 h-4" />
                        Study Flashcards
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Chapter Lessons */}
            {currentChapter && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">{currentChapter.title}</CardTitle>
                  <CardDescription>
                    {currentChapter.lessons.length} lessons
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    {currentChapter.lessons.map((l, index) => (
                      <Link key={l.id} href={`/lesson/${l.id}`}>
                        <div className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer ${
                          l.id === lessonId ? "bg-primary/10 text-primary" : "hover:bg-muted/50"
                        }`}>
                          <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-xs">
                            {index + 1}
                          </span>
                          <span className="text-sm truncate">{l.title}</span>
                        </div>
                      </Link>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
