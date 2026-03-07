import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import Header from "@/components/Header";
import { getLoginUrl } from "@/const";
import { Link, useLocation } from "wouter";
import { useState, useEffect, useMemo, useCallback } from "react";
import { Streamdown } from "streamdown";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  ChevronRight,
  Download,
  GraduationCap,
  Key,
  Layers,
  Lock,
  MessageCircle,
  RotateCcw,
  Send,
  Sparkles,
} from "lucide-react";

interface KeyTerm {
  term: string;
  definition: string;
}

interface PreviewLesson {
  title: string;
  content: string;
  keyTerms: KeyTerm[];
}

interface PreviewChapter {
  title: string;
  description: string;
  lessons: PreviewLesson[];
}

interface PreviewData {
  title: string;
  description: string;
  chapters: PreviewChapter[];
  relatedTopics: { name: string; relationship: string; description: string }[];
}

export default function PreviewCourse() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [previewTopic, setPreviewTopic] = useState("");
  const [selectedLessonIndex, setSelectedLessonIndex] = useState<{ chapter: number; lesson: number }>({ chapter: 0, lesson: 0 });
  const [showFlashcards, setShowFlashcards] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [cardFlipped, setCardFlipped] = useState(false);

  // Load preview data from sessionStorage
  useEffect(() => {
    const stored = sessionStorage.getItem("coursePreview");
    const storedTopic = sessionStorage.getItem("coursePreviewTopic");
    if (stored) {
      try {
        setPreviewData(JSON.parse(stored));
        setPreviewTopic(storedTopic || "");
      } catch {
        navigate("/create");
      }
    } else {
      navigate("/create");
    }
  }, [navigate]);

  // Get the currently selected lesson
  const selectedLesson = useMemo(() => {
    if (!previewData) return null;
    const chapter = previewData.chapters[selectedLessonIndex.chapter];
    if (!chapter) return null;
    return chapter.lessons[selectedLessonIndex.lesson] || null;
  }, [previewData, selectedLessonIndex]);

  // Get all key terms for flashcard preview
  const allKeyTerms = useMemo(() => {
    if (!previewData) return [];
    return previewData.chapters.flatMap(ch =>
      ch.lessons.flatMap(l => l.keyTerms)
    );
  }, [previewData]);

  // Total stats
  const totalLessons = useMemo(() => {
    if (!previewData) return 0;
    return previewData.chapters.reduce((acc, ch) => acc + ch.lessons.length, 0);
  }, [previewData]);

  const handleFlipCard = useCallback(() => {
    setCardFlipped(prev => !prev);
  }, []);

  const handleNextCard = useCallback(() => {
    setCardFlipped(false);
    setCurrentCardIndex(prev => (prev + 1) % allKeyTerms.length);
  }, [allKeyTerms.length]);

  const handlePrevCard = useCallback(() => {
    setCardFlipped(false);
    setCurrentCardIndex(prev => (prev - 1 + allKeyTerms.length) % allKeyTerms.length);
  }, [allKeyTerms.length]);

  if (!previewData) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-24 text-center">
          <p className="text-muted-foreground">Loading preview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {/* Back button */}
        <Link href="/create">
          <Button variant="ghost" size="sm" className="mb-6 gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Generator
          </Button>
        </Link>

        {/* Preview banner */}
        <div className="mb-6 p-4 rounded-lg border border-primary/20 bg-primary/5">
          <div className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
            <div>
              <p className="font-medium text-sm">
                This is a free preview of your generated course on "{previewTopic}"
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                Sign in to save this course, unlock full AI chat, generate flashcards, and export to PDF.
                Chat history is not saved in preview mode.
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Course header */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">Preview</Badge>
                  <Badge variant="outline">Introductory</Badge>
                </div>
                <CardTitle className="text-2xl">{previewData.title}</CardTitle>
                <CardDescription className="mt-2">
                  {previewData.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{previewData.chapters.length} chapters</span>
                  <span className="text-border">|</span>
                  <span>{totalLessons} lessons</span>
                  <span className="text-border">|</span>
                  <span>{allKeyTerms.length} key terms</span>
                </div>
              </CardContent>
            </Card>

            {/* Course outline */}
            <Card>
              <CardHeader>
                <CardTitle>Course Content</CardTitle>
                <CardDescription>
                  Click any lesson to preview its content
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" defaultValue={["chapter-0"]} className="w-full">
                  {previewData.chapters.map((chapter, chapterIndex) => (
                    <AccordionItem key={chapterIndex} value={`chapter-${chapterIndex}`}>
                      <AccordionTrigger className="hover:no-underline">
                        <div className="flex items-center gap-3 text-left">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-sm font-medium text-primary">
                            {chapterIndex + 1}
                          </div>
                          <div>
                            <div className="font-medium">{chapter.title}</div>
                            <div className="text-xs text-muted-foreground">
                              {chapter.lessons.length} lessons
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
                            const isSelected =
                              selectedLessonIndex.chapter === chapterIndex &&
                              selectedLessonIndex.lesson === lessonIndex;
                            return (
                              <div
                                key={lessonIndex}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer group ${
                                  isSelected
                                    ? "bg-primary/10 text-primary"
                                    : "hover:bg-muted/50"
                                }`}
                                onClick={() => {
                                  setSelectedLessonIndex({ chapter: chapterIndex, lesson: lessonIndex });
                                  setShowFlashcards(false);
                                }}
                              >
                                <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center">
                                  <span className="text-xs">{lessonIndex + 1}</span>
                                </div>
                                <span className="flex-1 text-sm">{lesson.title}</span>
                                <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            );
                          })}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>

            {/* Selected lesson content */}
            {selectedLesson && (
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="text-xs">
                      Ch. {selectedLessonIndex.chapter + 1}, Lesson {selectedLessonIndex.lesson + 1}
                    </Badge>
                  </div>
                  <CardTitle>{selectedLesson.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <Streamdown>{selectedLesson.content}</Streamdown>
                  </div>

                  {/* Key terms from this lesson */}
                  {selectedLesson.keyTerms.length > 0 && (
                    <div className="mt-8 pt-6 border-t">
                      <h3 className="font-semibold text-base mb-4 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-primary" />
                        Key Terms ({selectedLesson.keyTerms.length})
                      </h3>
                      <div className="space-y-3">
                        {selectedLesson.keyTerms.map((term, i) => (
                          <div key={i} className="p-3 rounded-lg bg-muted/50">
                            <span className="font-medium text-sm">{term.term}</span>
                            <span className="text-sm text-muted-foreground"> — {term.definition}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Sign-in CTA */}
            {!user && (
              <Card className="border-primary/30 bg-gradient-to-b from-primary/5 to-transparent">
                <CardContent className="pt-6 space-y-4">
                  <div className="text-center">
                    <GraduationCap className="w-10 h-10 mx-auto text-primary mb-3" />
                    <h3 className="font-semibold text-lg mb-1">Save this course</h3>
                    <p className="text-sm text-muted-foreground">
                      Sign in to save, customize, and unlock all features.
                    </p>
                  </div>
                  <Button className="w-full gap-2" asChild>
                    <a href={getLoginUrl()}>
                      <Key className="w-4 h-4" />
                      Sign In to Save
                    </a>
                  </Button>
                  <p className="text-xs text-center text-muted-foreground">
                    Or generate another preview — no account needed.
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Flashcard Preview */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Layers className="w-5 h-5 text-emerald-500" />
                  Flashcard Preview
                </CardTitle>
                <CardDescription>
                  {allKeyTerms.length} cards from key terms
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {allKeyTerms.length > 0 ? (
                  <>
                    {/* Flashcard */}
                    <div
                      className="relative h-48 rounded-xl border-2 border-dashed border-primary/20 bg-muted/30 cursor-pointer flex items-center justify-center p-6 transition-all hover:border-primary/40"
                      onClick={handleFlipCard}
                    >
                      <div className="text-center">
                        {!cardFlipped ? (
                          <>
                            <p className="font-semibold text-lg mb-2">
                              {allKeyTerms[currentCardIndex]?.term}
                            </p>
                            <p className="text-xs text-muted-foreground">Tap to reveal definition</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm leading-relaxed">
                              {allKeyTerms[currentCardIndex]?.definition}
                            </p>
                            <p className="text-xs text-muted-foreground mt-2">Tap to see term</p>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Card navigation */}
                    <div className="flex items-center justify-between">
                      <Button variant="ghost" size="sm" onClick={handlePrevCard}>
                        <ArrowLeft className="w-4 h-4" />
                      </Button>
                      <span className="text-sm text-muted-foreground">
                        {currentCardIndex + 1} / {allKeyTerms.length}
                      </span>
                      <Button variant="ghost" size="sm" onClick={handleNextCard}>
                        <ArrowRight className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Spaced repetition teaser */}
                    <div className="p-3 rounded-lg bg-muted/50 text-center">
                      <Lock className="w-4 h-4 mx-auto text-muted-foreground mb-1" />
                      <p className="text-xs text-muted-foreground">
                        Sign in to unlock spaced repetition scheduling and track mastery across sessions.
                      </p>
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No key terms found in this preview.
                  </p>
                )}
              </CardContent>
            </Card>

            {/* AI Chat Teaser */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <MessageCircle className="w-5 h-5 text-primary" />
                  AI Chapter Chat
                </CardTitle>
                <CardDescription>
                  Ask questions about any lesson
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Sample chat bubbles */}
                <div className="space-y-3">
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-primary text-primary-foreground">
                      Can you explain this concept more simply?
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-muted">
                      Of course! Think of it like this...
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-primary text-primary-foreground">
                      Give me a real-world example
                    </div>
                  </div>
                  <div className="flex justify-start">
                    <div className="max-w-[85%] rounded-lg px-3 py-2 text-sm bg-muted text-muted-foreground italic">
                      ...
                    </div>
                  </div>
                </div>

                {/* Locked input */}
                <div className="relative">
                  <Input
                    placeholder="Ask a question..."
                    disabled
                    className="pr-10 opacity-60"
                  />
                  <Button size="icon" className="absolute right-1 top-1 h-8 w-8" disabled>
                    <Send className="w-3 h-3" />
                  </Button>
                </div>

                {/* Microcopy about chat persistence */}
                <div className="p-3 rounded-lg bg-muted/50 space-y-2">
                  <div className="flex items-start gap-2">
                    <Lock className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Sign in to chat.</span>{" "}
                      Chapter chat lets you ask questions about any lesson and get instant AI explanations.
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <RotateCcw className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />
                    <p className="text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">Chat is session-based.</span>{" "}
                      Conversations reset when you leave the page. Save important answers to your notes to keep them.
                    </p>
                  </div>
                </div>

                {!user && (
                  <Button className="w-full gap-2" variant="outline" asChild>
                    <a href={getLoginUrl()}>
                      <MessageCircle className="w-4 h-4" />
                      Sign In to Start Chatting
                    </a>
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Feature unlock summary */}
            {!user && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg">Full features with sign-in</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {[
                      { icon: Sparkles, label: "Save and customize courses", desc: "Adjust length, depth, and approach" },
                      { icon: MessageCircle, label: "AI chapter chat", desc: "Ask questions inside every lesson" },
                      { icon: Layers, label: "Spaced repetition flashcards", desc: "SM-2 algorithm tracks your mastery" },
                      { icon: Download, label: "PDF export", desc: "Download courses with illustrations" },
                      { icon: Key, label: "Bring your own API key", desc: "Use OpenAI, Anthropic, or Grok" },
                    ].map((item, i) => {
                      const Icon = item.icon;
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div>
                            <p className="text-sm font-medium">{item.label}</p>
                            <p className="text-xs text-muted-foreground">{item.desc}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <Button className="w-full gap-2 mt-4" asChild>
                    <a href={getLoginUrl()}>
                      <GraduationCap className="w-4 h-4" />
                      Sign In to Unlock Everything
                    </a>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
