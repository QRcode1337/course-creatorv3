import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import Header from "@/components/Header";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import {
  ArrowRight,
  BookOpen,
  Brain,
  Code,
  Download,
  FlaskConical,
  Globe,
  GraduationCap,
  History,
  Key,
  Layers,
  MessageCircle,
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

const coreFeatures = [
  {
    icon: Sparkles,
    title: "Course Generation",
    description: "Build a structured course with modules, lessons, and key terms from a single prompt.",
    gradient: "gradient-primary",
  },
  {
    icon: MessageCircle,
    title: "Chapter AI Chat",
    description: "Ask questions inside each chapter for fast clarification and deeper study.",
    gradient: "gradient-accent",
  },
  {
    icon: Layers,
    title: "Flashcards",
    description: "Review key concepts with spaced repetition without making study materials by hand.",
    gradient: "bg-emerald-500",
  },
  {
    icon: Download,
    title: "PDF Export",
    description: "Export finished courses into clean, shareable documents with illustrations.",
    gradient: "bg-rose-500",
  },
  {
    icon: Key,
    title: "Flexible AI Setup",
    description: "Use Manus AI out of the box or add your own API key for more control.",
    gradient: "bg-violet-500",
  },
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
      <section className="gradient-hero py-20 md:py-28">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">AI Learning Workspace</span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-6">
              Turn any topic into a structured course and
              <span className="bg-gradient-to-r from-primary to-purple-600 bg-clip-text text-transparent"> study system</span>
              {" "}in minutes
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed">
              Generate lessons, review with flashcards, chat inside chapters, and export to PDF.
              Start with Manus AI or connect your own API key.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <Link href="/create">
                  <Button size="lg" className="gap-2 w-full sm:w-auto text-base px-8 py-6">
                    <Plus className="w-5 h-5" />
                    Create New Course
                  </Button>
                </Link>
              ) : (
                <Link href="/create">
                  <Button size="lg" className="gap-2 w-full sm:w-auto text-base px-8 py-6">
                    <Sparkles className="w-5 h-5" />
                    Generate Free Sample Course
                  </Button>
                </Link>
              )}
              <Link href="/library">
                <Button size="lg" variant="outline" className="gap-2 w-full sm:w-auto bg-white/50 text-base px-8 py-6">
                  <BookOpen className="w-5 h-5" />
                  Explore Sample Courses
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Core Features Row */}
      <section className="py-16 md:py-20 border-b">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Everything you need to learn, teach, or train from one prompt</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              A complete study workflow: generate, study, ask questions, export.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
            {coreFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="card-hover text-center border-0 shadow-sm bg-muted/30">
                  <CardContent className="pt-8 pb-6 px-5">
                    <div className={`w-14 h-14 rounded-2xl ${feature.gradient} flex items-center justify-center mx-auto mb-5`}>
                      <Icon className="w-7 h-7 text-white" />
                    </div>
                    <h3 className="font-semibold text-base mb-2">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {feature.description}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
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
                <Button variant="ghost" size="sm" className="gap-1">
                  View All <ArrowRight className="w-4 h-4" />
                </Button>
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
                  <p className="text-sm text-muted-foreground">Day Streak</p>
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

      {/* How It Works Section */}
      <section className="py-16 md:py-20 border-b">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How it works</h2>
            <p className="text-muted-foreground max-w-xl mx-auto text-lg">
              From topic to study system in four steps
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
            {[
              { step: "1", title: "Enter a topic", desc: "Type any subject you want to learn." },
              { step: "2", title: "AI generates your course", desc: "Structured chapters, lessons, and key terms." },
              { step: "3", title: "Study and interact", desc: "Flashcards, quizzes, and chapter AI chat." },
              { step: "4", title: "Export and share", desc: "Download as a professional PDF." },
            ].map((item) => (
              <div key={item.step} className="text-center">
                <div className="w-12 h-12 rounded-full gradient-primary flex items-center justify-center mx-auto mb-4 text-white font-bold text-lg">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Suggested Topics */}
      <section className="py-12 border-b">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2">Explore Topics</h2>
            <p className="text-muted-foreground">
              Pick a topic to generate a course instantly
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {suggestedTopics.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={index}
                  href={`/create?topic=${encodeURIComponent(item.topic)}`}
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

      {/* Detailed Feature Breakdown */}
      <section className="py-16 md:py-20 border-b bg-muted/30">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Built for real studying</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Not just generation. A complete loop: generate, study, ask questions, export.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="border-0 shadow-md">
              <CardContent className="pt-8 pb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center shrink-0">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Knowledge Graph</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Visualize how topics connect. See parent, child, and sibling relationships across your courses. Discover new learning paths.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-8 pb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-amber-500 flex items-center justify-center shrink-0">
                    <GraduationCap className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Interactive Quizzes</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      AI-generated quizzes at the end of each lesson with multiple-choice and short-answer questions. Instant feedback and explanations.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-8 pb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-pink-500 flex items-center justify-center shrink-0">
                    <Palette className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">AI Illustrations</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Generate illustrations, infographics, and diagrams for each lesson. Choose from multiple visual styles.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-0 shadow-md">
              <CardContent className="pt-8 pb-6">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 rounded-xl bg-cyan-500 flex items-center justify-center shrink-0">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-lg mb-2">Progress Tracking</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                      Track lesson completion, flashcard mastery, quiz scores, and study streaks. Stay motivated with a study calendar.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-16 md:py-20">
          <div className="container">
            <div className="max-w-2xl mx-auto text-center">
              <h2 className="text-3xl font-bold mb-4">Start learning in minutes</h2>
              <p className="text-muted-foreground text-lg mb-8">
                Generate a free sample course to see how it works. No account required to preview.
              </p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link href="/create">
                  <Button size="lg" className="gap-2 text-base px-8 py-6">
                    <Sparkles className="w-5 h-5" />
                    Generate Free Sample Course
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="gap-2 text-base px-8 py-6" asChild>
                  <a href={getLoginUrl()}>
                    <GraduationCap className="w-5 h-5" />
                    Sign In to Save Courses
                  </a>
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="py-8 border-t bg-muted/30">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-white" />
              </div>
              <span className="font-semibold">Course Creator</span>
            </div>
            <p className="text-sm text-muted-foreground">
              AI learning workspace — generate, study, chat, export
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
