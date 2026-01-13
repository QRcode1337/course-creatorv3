import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/Header";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useState, useMemo } from "react";
import {
  BookOpen,
  Filter,
  Loader2,
  Plus,
  Search,
} from "lucide-react";

export default function Library() {
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [approachFilter, setApproachFilter] = useState<string>("all");
  const [depthFilter, setDepthFilter] = useState<string>("all");

  const { data: courses, isLoading } = trpc.course.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: progressData } = trpc.progress.getOverall.useQuery(undefined, {
    enabled: !!user,
  });

  const filteredCourses = useMemo(() => {
    if (!courses) return [];
    
    return courses.filter(course => {
      const matchesSearch = course.title.toLowerCase().includes(search.toLowerCase()) ||
        course.topic.toLowerCase().includes(search.toLowerCase());
      const matchesApproach = approachFilter === "all" || course.approach === approachFilter;
      const matchesDepth = depthFilter === "all" || course.contentDepth === depthFilter;
      
      return matchesSearch && matchesApproach && matchesDepth;
    });
  }, [courses, search, approachFilter, depthFilter]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold">My Library</h1>
            <p className="text-muted-foreground">
              {courses?.length || 0} courses
            </p>
          </div>
          <Link href="/create">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Create Course
            </Button>
          </Link>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search courses..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={approachFilter} onValueChange={setApproachFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Approach" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Approaches</SelectItem>
              <SelectItem value="balanced">Balanced</SelectItem>
              <SelectItem value="rigorous">Rigorous</SelectItem>
              <SelectItem value="easy">Easy</SelectItem>
            </SelectContent>
          </Select>
          <Select value={depthFilter} onValueChange={setDepthFilter}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Depth" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Depths</SelectItem>
              <SelectItem value="introductory">Introductory</SelectItem>
              <SelectItem value="intermediate">Intermediate</SelectItem>
              <SelectItem value="advanced">Advanced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !user ? (
          <div className="text-center py-24">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign in to view your library</h2>
            <p className="text-muted-foreground mb-4">
              Create and manage your personalized courses
            </p>
          </div>
        ) : filteredCourses.length === 0 ? (
          <div className="text-center py-24">
            <BookOpen className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {search || approachFilter !== "all" || depthFilter !== "all"
                ? "No courses match your filters"
                : "No courses yet"}
            </h2>
            <p className="text-muted-foreground mb-4">
              {search || approachFilter !== "all" || depthFilter !== "all"
                ? "Try adjusting your search or filters"
                : "Create your first AI-powered course"}
            </p>
            {!search && approachFilter === "all" && depthFilter === "all" && (
              <Link href="/create">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Create Course
                </Button>
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCourses.map((course) => {
              const progress = progressData?.courses.find(c => c.courseId === course.id);
              return (
                <Link key={course.id} href={`/course/${course.id}`}>
                  <Card className="card-hover cursor-pointer h-full">
                    <CardHeader>
                      <div className="flex items-start justify-between mb-2">
                        <div className="w-12 h-12 rounded-lg gradient-primary flex items-center justify-center">
                          <BookOpen className="w-6 h-6 text-white" />
                        </div>
                        <div className="flex gap-1">
                          <Badge variant="secondary" className="capitalize text-xs">
                            {course.approach}
                          </Badge>
                        </div>
                      </div>
                      <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                      <CardDescription className="line-clamp-2">
                        {course.description}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="font-medium">{progress?.completion || 0}%</span>
                        </div>
                        <Progress value={progress?.completion || 0} className="h-2" />
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="capitalize">{course.contentDepth}</span>
                          <span>{new Date(course.createdAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
