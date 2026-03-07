import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import Header from "@/components/Header";
import { trpc } from "@/lib/trpc";
import { Link, useParams, useLocation } from "wouter";
import { toast } from "sonner";
import { useState, useEffect, useRef, useCallback } from "react";
import { Streamdown } from "streamdown";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  CheckCircle2,
  ChevronRight,
  Download,
  HelpCircle,
  Image,
  Layers,
  Lightbulb,
  Loader2,
  MessageCircle,
  Play,
  Send,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

export default function CourseView() {
  const { id } = useParams<{ id: string }>();
  const courseId = parseInt(id || "0");
  const { user } = useAuth();
  const [, navigate] = useLocation();

  // AI Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const chatScrollRef = useRef<HTMLDivElement>(null);

  const { data: course, isLoading } = trpc.course.get.useQuery(
    { id: courseId },
    { enabled: courseId > 0 }
  );

  const { data: progressData } = trpc.course.getProgress.useQuery(
    { courseId },
    { enabled: courseId > 0 && !!user }
  );

  const { data: flashcardStats } = trpc.flashcard.getStats.useQuery(
    { courseId },
    { enabled: courseId > 0 && !!user }
  );

  const deleteCourse = trpc.course.delete.useMutation({
    onSuccess: () => {
      toast.success("Course deleted");
      navigate("/library");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to delete course");
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

  const aiChat = trpc.aiChat.chatCourse.useMutation({
    onSuccess: (data) => {
      setChatMessages(prev => [...prev, { role: "assistant", content: data.response }]);
    },
    onError: () => {
      toast.error("Failed to get response");
    },
  });

  const exportPdf = trpc.course.exportPdf.useMutation({
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
      
      toast.success("Course PDF downloaded!");
    },
    onError: () => {
      toast.error("Failed to generate PDF");
    },
  });

  const generateAllImages = trpc.illustration.generateAll.useMutation({
    onSuccess: (data) => {
      toast.success(
        `Generated ${data.generated} images, skipped ${data.skipped}, failed ${data.failed}`
      );
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate images");
    },
  });

  // Scroll chat to bottom when new messages arrive
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [chatMessages]);

  const handleSendChatMessage = useCallback((message: string) => {
    if (!message.trim() || !course) return;
    
    const newMessages: ChatMessage[] = [...chatMessages, { role: "user", content: message }];
    setChatMessages(newMessages);
    setChatInput("");
    
    aiChat.mutate({
      courseId,
      messages: newMessages.map(m => ({ role: m.role, content: m.content })),
    });
  }, [chatMessages, courseId, course, aiChat]);

  // Suggestion buttons for AI chat
  const chatSuggestions = [
    { icon: Lightbulb, label: "Overview", prompt: "Give me a brief overview of what I'll learn in this course." },
    { icon: Zap, label: "Prerequisites", prompt: "What should I know before starting this course?" },
    { icon: HelpCircle, label: "Study tips", prompt: "What are the best strategies to learn this material effectively?" },
    { icon: BookOpen, label: "Key concepts", prompt: "What are the most important concepts I should focus on in this course?" },
  ];

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

  if (!course) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">Course not found</h1>
          <Link href="/library">
            <Button>Back to Library</Button>
          </Link>
        </div>
      </div>
    );
  }

  const isOwner = user && course.userId === user.id;
  const completedLessons = progressData?.progress.filter(p => p.isCompleted).length || 0;
  const totalLessons = course.chapters.reduce((acc, ch) => acc + ch.lessons.length, 0);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* Back button */}
        <Link href="/library">
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Library
          </Button>
        </Link>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Course header */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="secondary" className="capitalize">
                        {course.approach}
                      </Badge>
                      <Badge variant="outline" className="capitalize">
                        {course.contentDepth}
                      </Badge>
                    </div>
                    <CardTitle className="text-2xl">{course.title}</CardTitle>
                    <CardDescription className="mt-2">
                      {course.description}
                    </CardDescription>
                  </div>
                  {isOwner && (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="text-destructive">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete Course?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently delete this course and all associated data including flashcards, quizzes, and notes.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => deleteCourse.mutate({ id: courseId })}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                          >
                            Delete
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardHeader>
              {user && (
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium">
                        {completedLessons} / {totalLessons} lessons ({progressData?.completion || 0}%)
                      </span>
                    </div>
                    <Progress value={progressData?.completion || 0} className="h-2" />
                  </div>
                </CardContent>
              )}
            </Card>

            {/* Chapters and Lessons */}
            <Card>
              <CardHeader>
                <CardTitle>Course Content</CardTitle>
                <CardDescription>
                  {course.chapters.length} chapters • {totalLessons} lessons
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="w-full">
                  {course.chapters.map((chapter, chapterIndex) => {
                    const chapterLessonsCompleted = chapter.lessons.filter(
                      l => progressData?.progress.find(p => p.lessonId === l.id)?.isCompleted
                    ).length;
                    
                    return (
                      <AccordionItem key={chapter.id} value={`chapter-${chapter.id}`}>
                        <AccordionTrigger className="hover:no-underline">
                          <div className="flex items-center gap-3 text-left">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                              {chapterIndex + 1}
                            </div>
                            <div>
                              <div className="font-medium">{chapter.title}</div>
                              <div className="text-xs text-muted-foreground">
                                {chapter.lessons.length} lessons
                                {user && ` • ${chapterLessonsCompleted} completed`}
                              </div>
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pl-11 space-y-2">
                            {chapter.description && (
                              <p className="text-sm text-muted-foreground mb-4">
                                {chapter.description}
                              </p>
                            )}
                            {chapter.lessons.map((lesson, lessonIndex) => {
                              const isCompleted = progressData?.progress.find(
                                p => p.lessonId === lesson.id
                              )?.isCompleted;
                              
                              return (
                                <Link key={lesson.id} href={`/lesson/${lesson.id}`}>
                                  <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer group">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                      isCompleted 
                                        ? "bg-green-500 text-white" 
                                        : "bg-muted text-muted-foreground"
                                    }`}>
                                      {isCompleted ? (
                                        <CheckCircle2 className="w-4 h-4" />
                                      ) : (
                                        <span className="text-xs">{lessonIndex + 1}</span>
                                      )}
                                    </div>
                                    <span className="flex-1 text-sm">{lesson.title}</span>
                                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </div>
                                </Link>
                              );
                            })}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* AI Tutor Card */}
            <Card className="sticky top-24">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  AI Course Assistant
                </CardTitle>
                <CardDescription>
                  Ask questions about this course
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
                    <ScrollArea className="h-[280px] pr-4" ref={chatScrollRef}>
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

                    {/* Chat persistence notice */}
                    <p className="text-xs text-muted-foreground text-center">
                      Chat is session-based and resets when you leave. Save important answers to notes.
                    </p>

                    {/* Chat input */}
                    <div className="flex gap-2">
                      <Input
                        placeholder="Ask about this course..."
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
                      Sign in to chat with AI Assistant
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            {user && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {course.chapters[0]?.lessons[0] && (
                    <Link href={`/lesson/${course.chapters[0].lessons[0].id}`}>
                      <Button className="w-full gap-2">
                        <Play className="w-4 h-4" />
                        {completedLessons > 0 ? "Continue Learning" : "Start Course"}
                      </Button>
                    </Link>
                  )}
                  <Link href={`/flashcards?courseId=${courseId}`}>
                    <Button variant="outline" className="w-full gap-2">
                      <Layers className="w-4 h-4" />
                      Study Flashcards
                      {flashcardStats && flashcardStats.due > 0 && (
                        <Badge variant="secondary" className="ml-auto">
                          {flashcardStats.due} due
                        </Badge>
                      )}
                    </Button>
                  </Link>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2" 
                    onClick={() => generateAllImages.mutate({ courseId })}
                    disabled={generateAllImages.isPending}
                  >
                    {generateAllImages.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Image className="w-4 h-4" />
                    )}
                    {generateAllImages.isPending ? "Generating Images..." : "Generate All Images"}
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full gap-2" 
                    onClick={() => exportPdf.mutate({ courseId })}
                    disabled={exportPdf.isPending}
                  >
                    {exportPdf.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {exportPdf.isPending ? "Generating PDF..." : "Export PDF"}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Flashcard Stats */}
            {user && flashcardStats && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="w-5 h-5" />
                    Flashcards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold text-primary">{flashcardStats.total}</div>
                      <div className="text-xs text-muted-foreground">Total</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold text-amber-500">{flashcardStats.due}</div>
                      <div className="text-xs text-muted-foreground">Due</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold text-blue-500">{flashcardStats.learning}</div>
                      <div className="text-xs text-muted-foreground">Learning</div>
                    </div>
                    <div className="text-center p-3 rounded-lg bg-muted/50">
                      <div className="text-2xl font-bold text-green-500">{flashcardStats.mastered}</div>
                      <div className="text-xs text-muted-foreground">Mastered</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Related Topics */}
            {course.relatedTopics && course.relatedTopics.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Brain className="w-5 h-5" />
                    Related Topics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="parent" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="parent">Parent</TabsTrigger>
                      <TabsTrigger value="sibling">Sibling</TabsTrigger>
                      <TabsTrigger value="child">Child</TabsTrigger>
                    </TabsList>
                    {["parent", "sibling", "child"].map((rel) => (
                      <TabsContent key={rel} value={rel} className="mt-4">
                        <div className="space-y-2">
                          {course.relatedTopics
                            .filter(t => t.relationship === rel)
                            .map((topic) => (
                              <Link
                                key={topic.id}
                                href={user ? `/create?topic=${encodeURIComponent(topic.topicName)}` : "#"}
                              >
                                <div className="p-3 rounded-lg hover:bg-muted/50 cursor-pointer">
                                  <div className="font-medium text-sm">{topic.topicName}</div>
                                  {topic.description && (
                                    <div className="text-xs text-muted-foreground mt-1">
                                      {topic.description}
                                    </div>
                                  )}
                                </div>
                              </Link>
                            ))}
                          {course.relatedTopics.filter(t => t.relationship === rel).length === 0 && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No {rel} topics found
                            </p>
                          )}
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            )}

            {/* Glossary Preview */}
            {course.glossaryTerms && course.glossaryTerms.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    Glossary
                  </CardTitle>
                  <CardDescription>
                    {course.glossaryTerms.length} terms
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {course.glossaryTerms.slice(0, 10).map((term) => (
                      <div key={term.id} className="text-sm">
                        <span className="font-medium">{term.term}</span>
                        {term.definition && (
                          <span className="text-muted-foreground"> - {term.definition.slice(0, 100)}...</span>
                        )}
                      </div>
                    ))}
                    {course.glossaryTerms.length > 10 && (
                      <p className="text-xs text-muted-foreground text-center pt-2">
                        +{course.glossaryTerms.length - 10} more terms
                      </p>
                    )}
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
