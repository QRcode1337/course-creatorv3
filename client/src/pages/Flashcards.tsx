import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import Header from "@/components/Header";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Check,
  ChevronLeft,
  ChevronRight,
  Flame,
  Layers,
  Loader2,
  RotateCcw,
  Sparkles,
  X,
} from "lucide-react";

type StudyMode = "browse" | "study";
type CardSide = "front" | "back";

// SM-2 quality ratings
const qualityRatings = [
  { value: 0, label: "Again", description: "Complete blackout", color: "bg-red-500" },
  { value: 1, label: "Hard", description: "Incorrect, but remembered", color: "bg-orange-500" },
  { value: 2, label: "Okay", description: "Correct with difficulty", color: "bg-yellow-500" },
  { value: 3, label: "Good", description: "Correct with hesitation", color: "bg-blue-500" },
  { value: 4, label: "Easy", description: "Correct with ease", color: "bg-green-500" },
  { value: 5, label: "Perfect", description: "Instant recall", color: "bg-emerald-500" },
];

export default function Flashcards() {
  const { user } = useAuth();
  const urlParams = new URLSearchParams(window.location.search);
  const courseIdParam = urlParams.get("courseId");
  const lessonIdParam = urlParams.get("lessonId");

  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(
    courseIdParam ? parseInt(courseIdParam) : null
  );
  const [mode, setMode] = useState<StudyMode>("browse");
  const [currentCardIndex, setCurrentCardIndex] = useState(0);
  const [cardSide, setCardSide] = useState<CardSide>("front");
  const [studyComplete, setStudyComplete] = useState(false);
  const [sessionStats, setSessionStats] = useState({ reviewed: 0, correct: 0 });

  const { data: courses } = trpc.course.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: flashcards, isLoading, refetch } = trpc.flashcard.getDue.useQuery(
    undefined,
    { enabled: !!user }
  );

  const { data: stats } = trpc.flashcard.getStats.useQuery(
    { courseId: selectedCourseId || undefined },
    { enabled: !!user }
  );

  const reviewCard = trpc.flashcard.review.useMutation({
    onSuccess: (data) => {
      setSessionStats(prev => ({
        reviewed: prev.reviewed + 1,
        correct: prev.correct + (data.status === 'mastered' || data.status === 'review' ? 1 : 0),
      }));
      
      // Move to next card
      if (currentCardIndex < (flashcards?.length || 0) - 1) {
        setCurrentCardIndex(prev => prev + 1);
        setCardSide("front");
      } else {
        setStudyComplete(true);
      }
    },
    onError: (error) => {
      toast.error(error.message || "Failed to record review");
    },
  });

  const currentCard = flashcards?.[currentCardIndex];

  const flipCard = () => {
    setCardSide(prev => prev === "front" ? "back" : "front");
  };

  const handleRating = (quality: number) => {
    if (!currentCard) return;
    reviewCard.mutate({
      flashcardId: currentCard.id,
      quality,
    });
  };

  const startStudy = () => {
    setMode("study");
    setCurrentCardIndex(0);
    setCardSide("front");
    setStudyComplete(false);
    setSessionStats({ reviewed: 0, correct: 0 });
  };

  const endStudy = () => {
    setMode("browse");
    refetch();
  };

  // Filter cards by lesson if specified
  const displayCards = useMemo(() => {
    if (!flashcards) return [];
    if (lessonIdParam) {
      return flashcards.filter(f => f.lessonId === parseInt(lessonIdParam));
    }
    return flashcards;
  }, [flashcards, lessonIdParam]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        {mode === "browse" ? (
          <>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
              <div>
                <h1 className="text-3xl font-bold flex items-center gap-3">
                  <Layers className="w-8 h-8 text-primary" />
                  Flashcards
                </h1>
                <p className="text-muted-foreground">
                  Master concepts with spaced repetition
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Select
                  value={selectedCourseId?.toString() || "all"}
                  onValueChange={(v) => setSelectedCourseId(v === "all" ? null : parseInt(v))}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All Courses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses?.map(course => (
                      <SelectItem key={course.id} value={course.id.toString()}>
                        {course.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <Card className="glass">
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-primary">{stats.total}</div>
                    <p className="text-sm text-muted-foreground">Total Cards</p>
                  </CardContent>
                </Card>
                <Card className="glass">
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-amber-500">{stats.due}</div>
                    <p className="text-sm text-muted-foreground">Due Today</p>
                  </CardContent>
                </Card>
                <Card className="glass">
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-blue-500">{stats.learning}</div>
                    <p className="text-sm text-muted-foreground">Learning</p>
                  </CardContent>
                </Card>
                <Card className="glass">
                  <CardContent className="pt-6">
                    <div className="text-3xl font-bold text-green-500">{stats.mastered}</div>
                    <p className="text-sm text-muted-foreground">Mastered</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {isLoading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : !user ? (
              <div className="text-center py-24">
                <Layers className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Sign in to study flashcards</h2>
              </div>
            ) : displayCards.length === 0 ? (
              <div className="text-center py-24">
                <Layers className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">No flashcards due</h2>
                <p className="text-muted-foreground mb-4">
                  {stats && stats.total > 0
                    ? "Great job! You've reviewed all due cards."
                    : "Generate flashcards from your course lessons."}
                </p>
                <Link href="/library">
                  <Button className="gap-2">
                    <BookOpen className="w-4 h-4" />
                    Go to Library
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                {/* Start Study Button */}
                <Card className="mb-8">
                  <CardContent className="py-8 text-center">
                    <div className="w-20 h-20 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4">
                      <Brain className="w-10 h-10 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-2">Ready to Study?</h2>
                    <p className="text-muted-foreground mb-6">
                      You have {displayCards.length} cards due for review
                    </p>
                    <Button size="lg" onClick={startStudy} className="gap-2">
                      <Sparkles className="w-5 h-5" />
                      Start Study Session
                    </Button>
                  </CardContent>
                </Card>

                {/* Card Preview */}
                <h3 className="text-lg font-semibold mb-4">Due Cards Preview</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayCards.slice(0, 6).map((card) => (
                    <Card key={card.id} className="card-hover">
                      <CardContent className="pt-6">
                        <p className="font-medium mb-2">{card.front}</p>
                        <p className="text-sm text-muted-foreground line-clamp-2">{card.back}</p>
                        <div className="flex items-center gap-2 mt-4">
                          <Badge variant="outline">
                            {card.repetitions === 0 ? "New" : `${card.repetitions} reviews`}
                          </Badge>
                          {card.easeFactor && (
                            <Badge variant="secondary">
                              EF: {card.easeFactor.toFixed(1)}
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
                {displayCards.length > 6 && (
                  <p className="text-center text-muted-foreground mt-4">
                    +{displayCards.length - 6} more cards
                  </p>
                )}
              </>
            )}
          </>
        ) : studyComplete ? (
          /* Study Complete Screen */
          <div className="max-w-lg mx-auto text-center py-12">
            <div className="w-24 h-24 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
              <Check className="w-12 h-12 text-green-600" />
            </div>
            <h1 className="text-3xl font-bold mb-4">Session Complete!</h1>
            <p className="text-muted-foreground mb-8">
              Great work! You've reviewed all due cards.
            </p>
            <div className="grid grid-cols-2 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-primary">{sessionStats.reviewed}</div>
                  <p className="text-sm text-muted-foreground">Cards Reviewed</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6 text-center">
                  <div className="text-3xl font-bold text-green-500">
                    {sessionStats.reviewed > 0 
                      ? Math.round((sessionStats.correct / sessionStats.reviewed) * 100)
                      : 0}%
                  </div>
                  <p className="text-sm text-muted-foreground">Accuracy</p>
                </CardContent>
              </Card>
            </div>
            <div className="flex gap-4 justify-center">
              <Button variant="outline" onClick={endStudy} className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Back to Overview
              </Button>
              <Button onClick={startStudy} className="gap-2">
                <RotateCcw className="w-4 h-4" />
                Study Again
              </Button>
            </div>
          </div>
        ) : (
          /* Study Mode */
          <div className="max-w-2xl mx-auto">
            {/* Progress */}
            <div className="flex items-center justify-between mb-6">
              <Button variant="ghost" onClick={endStudy} className="gap-2">
                <X className="w-4 h-4" />
                End Session
              </Button>
              <div className="flex items-center gap-4">
                <span className="text-sm text-muted-foreground">
                  {currentCardIndex + 1} / {displayCards.length}
                </span>
                <Progress 
                  value={((currentCardIndex + 1) / displayCards.length) * 100} 
                  className="w-32 h-2"
                />
              </div>
            </div>

            {/* Flashcard */}
            {currentCard && (
              <div className="flashcard-flip mb-8">
                <div
                  className={`flashcard-inner relative cursor-pointer ${cardSide === "back" ? "flipped" : ""}`}
                  onClick={flipCard}
                  style={{ minHeight: "300px" }}
                >
                  {/* Front */}
                  <Card className="flashcard-front absolute inset-0">
                    <CardContent className="h-full flex flex-col items-center justify-center p-8">
                      <Badge variant="outline" className="mb-4">Front</Badge>
                      <p className="text-2xl font-medium text-center">{currentCard.front}</p>
                      <p className="text-sm text-muted-foreground mt-6">
                        Click to reveal answer
                      </p>
                    </CardContent>
                  </Card>

                  {/* Back */}
                  <Card className="flashcard-back absolute inset-0">
                    <CardContent className="h-full flex flex-col items-center justify-center p-8">
                      <Badge variant="outline" className="mb-4">Back</Badge>
                      <p className="text-xl text-center">{currentCard.back}</p>
                    </CardContent>
                  </Card>
                </div>
              </div>
            )}

            {/* Rating Buttons */}
            {cardSide === "back" && (
              <div className="space-y-4">
                <p className="text-center text-sm text-muted-foreground">
                  How well did you remember?
                </p>
                <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                  {qualityRatings.map((rating) => (
                    <Button
                      key={rating.value}
                      variant="outline"
                      onClick={() => handleRating(rating.value)}
                      disabled={reviewCard.isPending}
                      className="flex flex-col h-auto py-3"
                    >
                      <div className={`w-3 h-3 rounded-full ${rating.color} mb-1`} />
                      <span className="text-xs font-medium">{rating.label}</span>
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Card Info */}
            {currentCard && (
              <Card className="mt-8">
                <CardContent className="py-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Reviews: {currentCard.repetitions}
                    </span>
                    <span className="text-muted-foreground">
                      Ease Factor: {(currentCard.easeFactor || 2.5).toFixed(2)}
                    </span>
                    <span className="text-muted-foreground">
                      Interval: {currentCard.interval || 0} days
                    </span>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
