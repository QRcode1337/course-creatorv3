import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  endOfWeek,
  subMonths,
} from "date-fns";
import {
  BookOpen,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Flame,
  Layers,
  Loader2,
  Target,
  Trophy,
  Zap,
} from "lucide-react";

export default function Calendar() {
  const { user } = useAuth();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const { data: progressData, isLoading } = trpc.progress.getOverall.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: studyHistory } = trpc.progress.getActivities.useQuery(
    { limit: 100 },
    { enabled: !!user }
  );

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart);
    const calendarEnd = endOfWeek(monthEnd);

    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Get activity for a specific day
  const getActivityForDay = (date: Date) => {
    if (!studyHistory) return null;
    return studyHistory.find((h: any) => isSameDay(new Date(h.createdAt), date));
  };

  const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <CalendarIcon className="w-8 h-8 text-primary" />
              Study Calendar
            </h1>
            <p className="text-muted-foreground">
              Track your learning journey and maintain streaks
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !user ? (
          <div className="text-center py-24">
            <CalendarIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign in to view your calendar</h2>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Calendar */}
            <div className="lg:col-span-2">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>{format(currentMonth, "MMMM yyyy")}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="icon" onClick={prevMonth}>
                        <ChevronLeft className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={nextMonth}>
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Day headers */}
                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar grid */}
                  <div className="grid grid-cols-7 gap-1">
                    {calendarDays.map((day, index) => {
                      const activity = getActivityForDay(day);
                      const isCurrentMonth = isSameMonth(day, currentMonth);
                      const isCurrentDay = isToday(day);
                      const hasActivity = activity && activity.lessonsCompleted > 0;

                      return (
                        <div
                          key={index}
                          className={`aspect-square p-1 rounded-lg transition-colors ${
                            !isCurrentMonth
                              ? "opacity-30"
                              : isCurrentDay
                              ? "bg-primary/10 ring-2 ring-primary"
                              : hasActivity
                              ? "bg-green-50"
                              : "hover:bg-muted/50"
                          }`}
                        >
                          <div className="h-full flex flex-col items-center justify-center">
                            <span className={`text-sm ${isCurrentDay ? "font-bold text-primary" : ""}`}>
                              {format(day, "d")}
                            </span>
                            {hasActivity && (
                              <div className="flex items-center gap-0.5 mt-1">
                                {activity.lessonsCompleted > 0 && (
                                  <div className="w-2 h-2 rounded-full bg-green-500" />
                                )}
                                {activity.flashcardsReviewed > 0 && (
                                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                                )}
                                {activity.quizzesCompleted > 0 && (
                                  <div className="w-2 h-2 rounded-full bg-amber-500" />
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Legend */}
                  <div className="flex items-center justify-center gap-6 mt-6 pt-4 border-t">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                      <span className="text-sm text-muted-foreground">Lessons</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-blue-500" />
                      <span className="text-sm text-muted-foreground">Flashcards</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <span className="text-sm text-muted-foreground">Quizzes</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar Stats */}
            <div className="space-y-6">
              {/* Streak Card */}
              <Card className="gradient-accent text-white overflow-hidden">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-white/80 text-sm">Current Streak</p>
                      <div className="text-4xl font-bold flex items-center gap-2">
                        {progressData?.streak.currentStreak || 0}
                        <span className="text-2xl">days</span>
                      </div>
                    </div>
                    <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center">
                      <Flame className="w-8 h-8 fire-animated" />
                    </div>
                  </div>
                  {progressData?.streak.longestStreak && progressData.streak.longestStreak > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/20">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4" />
                        <span className="text-sm">
                          Longest streak: {progressData.streak.longestStreak} days
                        </span>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Today's Goals */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="w-5 h-5" />
                    Today's Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {studyHistory && getActivityForDay(new Date()) ? (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <BookOpen className="w-4 h-4 text-green-500" />
                          <span className="text-sm">Lessons Completed</span>
                        </div>
                        <Badge variant="secondary">
                          {getActivityForDay(new Date())?.lessonsCompleted || 0}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Layers className="w-4 h-4 text-blue-500" />
                          <span className="text-sm">Flashcards Reviewed</span>
                        </div>
                        <Badge variant="secondary">
                          {getActivityForDay(new Date())?.flashcardsReviewed || 0}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Zap className="w-4 h-4 text-amber-500" />
                          <span className="text-sm">Quizzes Completed</span>
                        </div>
                        <Badge variant="secondary">
                          {getActivityForDay(new Date())?.quizzesCompleted || 0}
                        </Badge>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-muted-foreground text-sm">
                        No activity recorded today
                      </p>
                      <Link href="/library">
                        <Button variant="outline" size="sm" className="mt-3 gap-2">
                          <BookOpen className="w-4 h-4" />
                          Start Learning
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Overall Progress</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Total Courses</span>
                    <span className="font-medium">{progressData?.courses.length || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Flashcards Mastered</span>
                    <span className="font-medium">{progressData?.flashcardStats.mastered || 0}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Cards Due Today</span>
                    <span className="font-medium text-amber-500">
                      {progressData?.flashcardStats.due || 0}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Flashcards Due */}
              {progressData && progressData.flashcardStats.due > 0 && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
                        <Layers className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium">Flashcards Due</p>
                        <p className="text-sm text-muted-foreground">
                          {progressData.flashcardStats.due} cards waiting for review
                        </p>
                      </div>
                    </div>
                    <Link href="/flashcards">
                      <Button className="w-full mt-4 gap-2">
                        <Layers className="w-4 h-4" />
                        Study Now
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
