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
import Header from "@/components/Header";
import { AIChatBox, Message } from "@/components/AIChatBox";
import { trpc } from "@/lib/trpc";
import { Link, useParams, useLocation } from "wouter";
import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Layers,
  Loader2,
  MessageCircle,
  NotebookPen,
  Palette,
  Plus,
  RefreshCw,
  Save,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";

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
  const [chatMessages, setChatMessages] = useState<Message[]>([]);
  const [chatOpen, setChatOpen] = useState(false);

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
    }
  }, [userNote]);

  const markComplete = trpc.lesson.markComplete.useMutation({
    onSuccess: () => {
      toast.success("Lesson marked as complete!");
    },
  });

  const saveNotes = trpc.notes.save.useMutation({
    onSuccess: () => {
      setNotesSaved(true);
    },
  });

  const generateQuiz = trpc.quiz.generate.useMutation({
    onSuccess: () => {
      toast.success("Quiz generated!");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate quiz");
    },
  });

  const submitQuiz = trpc.quiz.submit.useMutation({
    onSuccess: (data) => {
      setQuizSubmitted(true);
      setQuizFeedback(data.feedback);
      toast.success(`Quiz completed! Score: ${Math.round(data.score)}%`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to submit quiz");
    },
  });

  const generateFlashcards = trpc.flashcard.generate.useMutation({
    onSuccess: (data) => {
      toast.success(`Generated ${data.count} flashcards`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate flashcards");
    },
  });

  const generateMedia = trpc.illustration.generate.useMutation({
    onSuccess: () => {
      toast.success("Media generated!");
      setMediaDialogOpen(false);
      refetchLesson();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate media");
    },
  });

  const deleteIllustration = trpc.illustration.delete.useMutation({
    onSuccess: () => {
      toast.success("Illustration deleted");
      refetchLesson();
    },
  });

  const regenerateLesson = trpc.lesson.regenerate.useMutation({
    onSuccess: () => {
      toast.success("Lesson content regenerated!");
      refetchLesson();
    },
    onError: (error) => {
      toast.error(error.message || "Failed to regenerate lesson");
    },
  });

  // AI Chat mutation
  const aiChat = trpc.aiChat.chat.useMutation({
    onSuccess: (data) => {
      setChatMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to get AI response");
    },
  });

  // Handle sending chat message
  const handleSendChatMessage = useCallback((content: string) => {
    const newMessages: Message[] = [...chatMessages, { role: "user", content }];
    setChatMessages(newMessages);
    aiChat.mutate({
      lessonId,
      messages: newMessages,
    });
  }, [chatMessages, lessonId, aiChat]);

  // Save AI response to notes
  const handleSaveToNotes = useCallback((content: string) => {
    const newNotes = notes ? `${notes}\n\n---\n\n**AI Explanation:**\n${content}` : `**AI Explanation:**\n${content}`;
    setNotes(newNotes);
    setNotesSaved(false);
    if (user && lesson) {
      saveNotes.mutate({
        lessonId,
        courseId: lesson.courseId,
        content: newNotes,
      });
    }
    toast.success("Saved to notes!");
  }, [notes, user, lesson, lessonId, saveNotes]);

  // Auto-save notes
  const handleNotesChange = useCallback((value: string) => {
    setNotes(value);
    setNotesSaved(false);
  }, []);

  useEffect(() => {
    if (!notesSaved && user && lesson) {
      const timer = setTimeout(() => {
        saveNotes.mutate({
          lessonId,
          courseId: lesson.courseId,
          content: notes,
        });
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [notes, notesSaved, user, lesson, lessonId]);

  // Find current lesson position
  const currentChapter = course?.chapters.find(ch => ch.id === lesson?.chapterId);
  const currentLessonIndex = currentChapter?.lessons.findIndex(l => l.id === lessonId) ?? -1;
  
  // Find previous and next lessons
  const allLessons = course?.chapters.flatMap(ch => ch.lessons) || [];
  const currentGlobalIndex = allLessons.findIndex(l => l.id === lessonId);
  const prevLesson = currentGlobalIndex > 0 ? allLessons[currentGlobalIndex - 1] : null;
  const nextLesson = currentGlobalIndex < allLessons.length - 1 ? allLessons[currentGlobalIndex + 1] : null;

  const lessonFlashcardCount = flashcards?.filter(f => f.lessonId === lessonId).length || 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-24">
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main content */}
          <div className="lg:col-span-3">
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
                    <TabsTrigger value="chat" className="gap-2">
                      <MessageCircle className="w-4 h-4" />
                      AI Tutor
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="content" className="space-y-6">
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

                    {/* Illustrations */}
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Illustrations</h3>
                        {isOwner && (
                          <Dialog open={mediaDialogOpen} onOpenChange={setMediaDialogOpen}>
                            <DialogTrigger asChild>
                              <Button variant="outline" size="sm" className="gap-2">
                                <Plus className="w-4 h-4" />
                                Add More
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
                                    <Sparkles className="w-4 h-4" />
                                  )}
                                  Generate
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                      
                      {lesson.illustrations && lesson.illustrations.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {lesson.illustrations.map((illustration) => (
                            <div key={illustration.id} className="relative group">
                              <img
                                src={illustration.imageUrl}
                                alt={illustration.caption || "Lesson illustration"}
                                className="w-full rounded-lg border"
                              />
                              {isOwner && (
                                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => deleteIllustration.mutate({ id: illustration.id })}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                              {illustration.caption && (
                                <p className="text-sm text-muted-foreground mt-2 text-center">
                                  {illustration.caption}
                                </p>
                              )}
                              <Badge variant="secondary" className="absolute bottom-2 left-2">
                                {illustration.mediaType.replace("_", " ")}
                              </Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 border rounded-lg bg-muted/30">
                          <ImageIcon className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
                          <p className="text-muted-foreground mb-3">No illustrations yet</p>
                          {isOwner && (
                            <Button
                              variant="outline"
                              onClick={() => setMediaDialogOpen(true)}
                              className="gap-2"
                            >
                              <Plus className="w-4 h-4" />
                              Generate Illustration
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="notes">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Your notes are automatically saved
                        </p>
                        {!notesSaved && (
                          <Badge variant="outline" className="gap-1">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Saving...
                          </Badge>
                        )}
                        {notesSaved && notes && (
                          <Badge variant="outline" className="gap-1 text-green-600">
                            <Check className="w-3 h-3" />
                            Saved
                          </Badge>
                        )}
                      </div>
                      <Textarea
                        placeholder="Write your notes here..."
                        value={notes}
                        onChange={(e) => handleNotesChange(e.target.value)}
                        className="min-h-[400px] resize-none"
                        disabled={!user}
                      />
                      {!user && (
                        <p className="text-sm text-muted-foreground">
                          Sign in to save notes
                        </p>
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="quiz">
                    {!quiz ? (
                      <div className="text-center py-12">
                        <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <h3 className="text-lg font-semibold mb-2">No Quiz Yet</h3>
                        <p className="text-muted-foreground mb-4">
                          Generate an AI-powered quiz to test your understanding
                        </p>
                        {user && isOwner && (
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

                  <TabsContent value="chat">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">AI Tutor</h3>
                          <p className="text-sm text-muted-foreground">
                            Ask questions about this lesson and get instant explanations
                          </p>
                        </div>
                        {chatMessages.filter(m => m.role === "assistant").length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const lastAssistantMessage = [...chatMessages].reverse().find(m => m.role === "assistant");
                              if (lastAssistantMessage) {
                                handleSaveToNotes(lastAssistantMessage.content);
                              }
                            }}
                            className="gap-2"
                          >
                            <Save className="w-4 h-4" />
                            Save Last Response to Notes
                          </Button>
                        )}
                      </div>
                      
                      {user ? (
                        <AIChatBox
                          messages={chatMessages}
                          onSendMessage={handleSendChatMessage}
                          isLoading={aiChat.isPending}
                          placeholder="Ask a question about this lesson..."
                          height="450px"
                          emptyStateMessage="Ask me anything about this lesson!"
                          suggestedPrompts={[
                            "Explain the main concepts",
                            "Give me a real-world example",
                            "What are the key takeaways?",
                            "Help me understand this better"
                          ]}
                        />
                      ) : (
                        <div className="text-center py-12 border rounded-lg bg-muted/30">
                          <MessageCircle className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                          <h3 className="text-lg font-semibold mb-2">Sign in to use AI Tutor</h3>
                          <p className="text-muted-foreground">
                            Get personalized explanations and answers to your questions
                          </p>
                        </div>
                      )}
                    </div>
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

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Flashcards */}
            {user && (
              <Card>
                <CardHeader>
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
                <CardHeader>
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
