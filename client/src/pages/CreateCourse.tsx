import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/Header";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { useState } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  GraduationCap,
  Lightbulb,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";

const approaches = [
  {
    value: "balanced",
    label: "Balanced",
    description: "Comprehensive theory with practical applications",
    icon: BookOpen,
  },
  {
    value: "rigorous",
    label: "Rigorous Academic",
    description: "Deep theoretical foundations and scholarly depth",
    icon: GraduationCap,
  },
  {
    value: "easy",
    label: "Easily Explained",
    description: "High school level clarity with simple language",
    icon: Lightbulb,
  },
];

export default function CreateCourse() {
  const { user, loading: authLoading } = useAuth();
  const [, navigate] = useLocation();

  // Get topic from URL if provided
  const urlParams = new URLSearchParams(window.location.search);
  const initialTopic = urlParams.get("topic") || "";

  const [topic, setTopic] = useState(initialTopic);
  const [approach, setApproach] = useState<"balanced" | "rigorous" | "easy">("balanced");
  const [courseLength, setCourseLength] = useState<"short" | "medium" | "comprehensive">("medium");
  const [lessonsPerChapter, setLessonsPerChapter] = useState<"few" | "moderate" | "many">("moderate");
  const [contentDepth, setContentDepth] = useState<"introductory" | "intermediate" | "advanced">("intermediate");

  // Authenticated course creation
  const createCourse = trpc.course.create.useMutation({
    onSuccess: (data) => {
      toast.success("Course created successfully!");
      navigate(`/course/${data.courseId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create course");
    },
  });

  // Guest preview generation
  const previewCourse = trpc.course.preview.useMutation({
    onSuccess: (data) => {
      // Store preview data in sessionStorage and navigate to preview page
      sessionStorage.setItem("coursePreview", JSON.stringify(data));
      sessionStorage.setItem("coursePreviewTopic", topic.trim());
      navigate("/preview");
    },
    onError: (error) => {
      toast.error(error.message || "Failed to generate preview");
    },
  });

  const isPending = createCourse.isPending || previewCourse.isPending;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    if (user) {
      // Authenticated: create and save to DB
      createCourse.mutate({
        topic: topic.trim(),
        approach,
        courseLength,
        lessonsPerChapter,
        contentDepth,
      });
    } else {
      // Guest: generate preview only
      previewCourse.mutate({ topic: topic.trim() });
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const isGuest = !user;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">
                {isGuest ? "Free Preview" : "AI-Powered Generation"}
              </span>
            </div>
            <h1 className="text-3xl font-bold mb-2">
              {isGuest ? "Try It Free — Generate a Sample Course" : "Create a New Course"}
            </h1>
            <p className="text-muted-foreground">
              {isGuest
                ? "Enter any topic and see a full course outline with lesson content, flashcard preview, and AI chat teaser. No sign-up needed."
                : "Enter any topic and let AI generate a complete course for you"}
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Topic</CardTitle>
                <CardDescription>
                  What would you like to learn about?
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Input
                  placeholder="e.g., Machine Learning Fundamentals, World War II History, Music Theory..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="text-lg"
                  disabled={isPending}
                />
              </CardContent>
            </Card>

            {/* Show full customization only for authenticated users */}
            {user && (
              <>
                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Learning Approach</CardTitle>
                    <CardDescription>
                      Choose how the content should be presented
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup
                      value={approach}
                      onValueChange={(v) => setApproach(v as typeof approach)}
                      className="grid grid-cols-1 md:grid-cols-3 gap-4"
                      disabled={isPending}
                    >
                      {approaches.map((item) => {
                        const Icon = item.icon;
                        return (
                          <Label
                            key={item.value}
                            htmlFor={item.value}
                            className={`flex flex-col items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                              approach === item.value
                                ? "border-primary bg-primary/5"
                                : "border-border hover:border-primary/50"
                            }`}
                          >
                            <RadioGroupItem
                              value={item.value}
                              id={item.value}
                              className="sr-only"
                            />
                            <div className={`w-12 h-12 rounded-lg flex items-center justify-center mb-3 ${
                              approach === item.value ? "gradient-primary" : "bg-muted"
                            }`}>
                              <Icon className={`w-6 h-6 ${approach === item.value ? "text-white" : "text-muted-foreground"}`} />
                            </div>
                            <span className="font-medium text-center">{item.label}</span>
                            <span className="text-xs text-muted-foreground text-center mt-1">
                              {item.description}
                            </span>
                          </Label>
                        );
                      })}
                    </RadioGroup>
                  </CardContent>
                </Card>

                <Card className="mb-6">
                  <CardHeader>
                    <CardTitle>Customization</CardTitle>
                    <CardDescription>
                      Fine-tune the course structure
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Course Length</Label>
                        <Select
                          value={courseLength}
                          onValueChange={(v) => setCourseLength(v as typeof courseLength)}
                          disabled={isPending}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="short">Short (3-5 chapters)</SelectItem>
                            <SelectItem value="medium">Medium (6-10 chapters)</SelectItem>
                            <SelectItem value="comprehensive">Comprehensive (11+ chapters)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Lessons per Chapter</Label>
                        <Select
                          value={lessonsPerChapter}
                          onValueChange={(v) => setLessonsPerChapter(v as typeof lessonsPerChapter)}
                          disabled={isPending}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="few">Few (2-3 lessons)</SelectItem>
                            <SelectItem value="moderate">Moderate (4-6 lessons)</SelectItem>
                            <SelectItem value="many">Many (7+ lessons)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label>Content Depth</Label>
                        <Select
                          value={contentDepth}
                          onValueChange={(v) => setContentDepth(v as typeof contentDepth)}
                          disabled={isPending}
                        >
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
                  </CardContent>
                </Card>
              </>
            )}

            {/* Guest info card */}
            {isGuest && (
              <Card className="mb-6 border-primary/20 bg-primary/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p className="font-medium text-foreground">What you will see in the preview:</p>
                      <ul className="list-disc list-inside space-y-0.5">
                        <li>Full course outline with chapters and lessons</li>
                        <li>Complete lesson content for the first lesson</li>
                        <li>Flashcard preview from key terms</li>
                        <li>AI chat teaser (sign in to unlock full conversations)</li>
                      </ul>
                      <p className="pt-1">The preview uses a short, introductory format. Sign in to customize length, depth, and approach.</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full gap-2"
              disabled={isPending || !topic.trim()}
            >
              {isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  {isGuest ? "Generating Preview..." : "Generating Course..."}
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  {isGuest ? "Generate Free Preview" : "Generate Course"}
                </>
              )}
            </Button>

            {isPending && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                {isGuest
                  ? "This may take a minute. AI is building your sample course..."
                  : "This may take a minute. AI is creating your personalized course structure..."}
              </p>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
