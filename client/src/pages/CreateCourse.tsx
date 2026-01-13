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
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  BookOpen,
  GraduationCap,
  Lightbulb,
  Loader2,
  Sparkles,
  Zap,
} from "lucide-react";
import { getLoginUrl } from "@/const";

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

  const createCourse = trpc.course.create.useMutation({
    onSuccess: (data) => {
      toast.success("Course created successfully!");
      navigate(`/course/${data.courseId}`);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to create course");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }
    createCourse.mutate({
      topic: topic.trim(),
      approach,
      courseLength,
      lessonsPerChapter,
      contentDepth,
    });
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

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-24 text-center">
          <h1 className="text-2xl font-bold mb-4">Sign in to create courses</h1>
          <Button asChild>
            <a href={getLoginUrl()}>Sign in</a>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-4">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">AI-Powered Generation</span>
            </div>
            <h1 className="text-3xl font-bold mb-2">Create a New Course</h1>
            <p className="text-muted-foreground">
              Enter any topic and let AI generate a complete course for you
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
                  disabled={createCourse.isPending}
                />
              </CardContent>
            </Card>

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
                  disabled={createCourse.isPending}
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
                      disabled={createCourse.isPending}
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
                      disabled={createCourse.isPending}
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
                      disabled={createCourse.isPending}
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

            <Button
              type="submit"
              size="lg"
              className="w-full gap-2"
              disabled={createCourse.isPending || !topic.trim()}
            >
              {createCourse.isPending ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Generating Course...
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5" />
                  Generate Course
                </>
              )}
            </Button>

            {createCourse.isPending && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                This may take a minute. AI is creating your personalized course structure...
              </p>
            )}
          </form>
        </div>
      </main>
    </div>
  );
}
