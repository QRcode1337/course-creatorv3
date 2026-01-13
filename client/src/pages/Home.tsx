import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import Header from "@/components/Header";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  BookOpen,
  Brain,
  Code,
  FlaskConical,
  Globe,
  GraduationCap,
  History,
  Layers,
  Lightbulb,
  Music,
  Palette,
  Plus,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Progress } from "@/components/ui/progress";

const suggestedTopics = [
  { topic: "Machine Learning Fundamentals", icon: Brain, category: "Technology" },
  { topic: "Quantum Physics", icon: FlaskConical, category: "Science" },
  { topic: "World War II History", icon: History, category: "History" },
  { topic: "Music Theory Basics", icon: Music, category: "Arts" },
  { topic: "Web Development with React", icon: Code, category: "Technology" },
  { topic: "Climate Science", icon: Globe, category: "Science" },
  { topic: "Renaissance Art", icon: Palette, category: "Arts" },
  { topic: "Behavioral Economics", icon: TrendingUp, category: "Business" },
];

const categories = [
  { name: "Technology", icon: Code, color: "bg-blue-500" },
  { name: "Science", icon: FlaskConical, color: "bg-green-500" },
  { name: "History", icon: History, color: "bg-amber-500" },
  { name: "Arts", icon: Palette, color: "bg-purple-500" },
];

export default function Home() {
  const { user, loading: authLoading } = useAuth();
  const { data: courses, isLoading: coursesLoading } = trpc.course.list.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: progressData } = trpc.progress.getOverall.useQuery(undefined, {
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Hero Section */}
      <section className="gradient-hero py-16 md:py-24">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">AI-Powered Learning</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Create Your Perfect
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent"> Learning Journey</span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Transform any topic into a comprehensive course with AI-generated lessons, 
              interactive quizzes, flashcards, and visual content.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link href="/create">
                  <Button size="lg" className="gap-2 w-full sm:w-auto">
                    <Plus className="w-5 h-5" />
                    Create New Course
                  </Button>
                </Link>
              ) : (
                <Button size="lg" className="gap-2" asChild>
                  <a href={getLoginUrl()}>
                    <GraduationCap className="w-5 h-5" />
                    Get Started Free
                  </a>
                </Button>
              )}
              <Link href="/library">
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto bg-white/50">
                  <BookOpen className="w-5 h-5" />
                  Browse Library
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* User's Courses Section (if logged in) */}
      {user && courses && courses.length > 0 && (
        <section className="py-12 border-b">
          <div className="container">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold">Continue Learning</h2>
              <Link href="/library">
                <Button variant="ghost" size="sm">View All</Button>
              </Link>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.slice(0, 3).map((course) => {
                const progress = progressData?.courses.find(c => c.courseId === course.id);
                return (
                  <Link key={course.id} href={`/course/${course.id}`}>
                    <Card className="card-hover cursor-pointer h-full">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center mb-3">
                            <BookOpen className="w-6 h-6 text-white" />
                          </div>
                          <span className="text-xs px-2 py-1 rounded-full bg-secondary text-secondary-foreground capitalize">
                            {course.approach}
                          </span>
                        </div>
                        <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {course.description}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="font-medium">{progress?.completion || 0}%</span>
                          </div>
                          <Progress value={progress?.completion || 0} className="h-2" />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Study Stats (if logged in) */}
      {user && progressData && (
        <section className="py-12 border-b bg-muted/30">
          <div className="container">
            <h2 className="text-2xl font-bold mb-6">Your Progress</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="glass">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary">
                    {progressData.streak.currentStreak}
                  </div>
                  <p className="text-sm text-muted-foreground">Day Streak 🔥</p>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary">
                    {progressData.courses.length}
                  </div>
                  <p className="text-sm text-muted-foreground">Courses</p>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-primary">
                    {progressData.flashcardStats.mastered}
                  </div>
                  <p className="text-sm text-muted-foreground">Cards Mastered</p>
                </CardContent>
              </Card>
              <Card className="glass">
                <CardContent className="pt-6">
                  <div className="text-3xl font-bold text-accent">
                    {progressData.flashcardStats.due}
                  </div>
                  <p className="text-sm text-muted-foreground">Cards Due</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>
      )}

      {/* Suggested Topics */}
      <section className="py-12 border-b">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Explore Topics</h2>
            <p className="text-muted-foreground">
              Get inspired by these popular learning topics
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {suggestedTopics.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={index}
                  href={user ? `/create?topic=${encodeURIComponent(item.topic)}` : getLoginUrl()}
                >
                  <Card className="card-hover cursor-pointer group">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-medium line-clamp-2 mb-1">{item.topic}</h3>
                          <span className="text-xs text-muted-foreground">{item.category}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="py-12 border-b">
        <div className="container">
          <h2 className="text-2xl font-bold mb-6 text-center">Browse by Category</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((category) => {
              const Icon = category.icon;
              return (
                <Link
                  key={category.name}
                  href={user ? `/create?category=${encodeURIComponent(category.name)}` : getLoginUrl()}
                >
                  <Card className="card-hover cursor-pointer text-center">
                    <CardContent className="pt-6">
                      <div className={`w-14 h-14 rounded-xl ${category.color} flex items-center justify-center mx-auto mb-3`}>
                        <Icon className="w-7 h-7 text-white" />
                      </div>
                      <h3 className="font-medium">{category.name}</h3>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Powerful Learning Features</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Everything you need for effective learning, powered by AI
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-4">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI Course Generation</h3>
              <p className="text-muted-foreground">
                Generate complete courses with chapters, lessons, and key terms from any topic
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl gradient-accent flex items-center justify-center mx-auto mb-4">
                <Layers className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Smart Flashcards</h3>
              <p className="text-muted-foreground">
                SM-2 spaced repetition algorithm for optimal memory retention
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center mx-auto mb-4">
                <Brain className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Knowledge Graph</h3>
              <p className="text-muted-foreground">
                Visualize topic relationships and discover learning paths
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-purple-500 flex items-center justify-center mx-auto mb-4">
                <Lightbulb className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Interactive Quizzes</h3>
              <p className="text-muted-foreground">
                AI-generated quizzes with instant feedback and explanations
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-pink-500 flex items-center justify-center mx-auto mb-4">
                <Palette className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Visual Content</h3>
              <p className="text-muted-foreground">
                Generate illustrations, infographics, and diagrams for lessons
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500 flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Progress Tracking</h3>
              <p className="text-muted-foreground">
                Track your learning journey with detailed analytics and streaks
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t bg-muted/30">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">AI Course Creator</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Powered by AI • Built for learners
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
