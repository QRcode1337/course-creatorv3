import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/Header";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useState, useCallback, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Node,
  Edge,
  MarkerType,
  Position,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  BookOpen,
  Brain,
  ChevronRight,
  Compass,
  Layers,
  Loader2,
  Map,
  Plus,
  Sparkles,
  Target,
  TrendingUp,
  Zap,
} from "lucide-react";

// Learning path types
const learningPaths = [
  {
    id: "foundational",
    name: "Foundational",
    description: "Build strong basics before advancing",
    icon: Layers,
    color: "bg-blue-500",
  },
  {
    id: "momentum",
    name: "Momentum",
    description: "Quick wins to build confidence",
    icon: Zap,
    color: "bg-amber-500",
  },
  {
    id: "breadth",
    name: "Breadth",
    description: "Explore related topics widely",
    icon: Compass,
    color: "bg-green-500",
  },
  {
    id: "depth",
    name: "Depth",
    description: "Deep dive into specialization",
    icon: Target,
    color: "bg-purple-500",
  },
];

// Custom node component
const CustomNode = ({ data }: { data: any }) => {
  return (
    <div
      className={`px-4 py-3 rounded-lg border-2 shadow-lg transition-all ${
        data.isCurrent
          ? "border-primary bg-primary/10"
          : data.isCompleted
          ? "border-green-500 bg-green-50"
          : "border-border bg-card"
      }`}
      style={{ minWidth: 150 }}
    >
      <div className="flex items-center gap-2">
        <div className={`w-3 h-3 rounded-full ${
          data.isCurrent ? "bg-primary" : data.isCompleted ? "bg-green-500" : "bg-muted"
        }`} />
        <span className="font-medium text-sm">{data.label}</span>
      </div>
      {data.relationship && (
        <Badge variant="outline" className="mt-2 text-xs">
          {data.relationship}
        </Badge>
      )}
    </div>
  );
};

const nodeTypes = {
  custom: CustomNode,
};

export default function KnowledgeGraph() {
  const { user } = useAuth();
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const { data: courses, isLoading: coursesLoading } = trpc.course.list.useQuery(undefined, {
    enabled: !!user,
  });

  const { data: courseData } = trpc.course.get.useQuery(
    { id: selectedCourseId || 0 },
    { enabled: !!selectedCourseId }
  );

  const { data: progressData } = trpc.progress.getOverall.useQuery(undefined, {
    enabled: !!user,
  });

  // Build nodes and edges from course data
  const { initialNodes, initialEdges } = useMemo(() => {
    if (!courseData) {
      return { initialNodes: [], initialEdges: [] };
    }

    const nodes: Node[] = [];
    const edges: Edge[] = [];

    // Add main course node
    nodes.push({
      id: `course-${courseData.id}`,
      type: "custom",
      position: { x: 400, y: 50 },
      data: {
        label: courseData.title,
        isCurrent: true,
        isCompleted: false,
      },
    });

    // Add related topics
    const relatedTopics = courseData.relatedTopics || [];
    
    // Parent topics (above)
    const parentTopics = relatedTopics.filter(t => t.relationship === "parent");
    parentTopics.forEach((topic, index) => {
      const nodeId = `topic-${topic.id}`;
      nodes.push({
        id: nodeId,
        type: "custom",
        position: { x: 200 + index * 250, y: -100 },
        data: {
          label: topic.topicName,
          relationship: "Parent",
          isCurrent: false,
          isCompleted: false,
        },
      });
      edges.push({
        id: `edge-parent-${topic.id}`,
        source: nodeId,
        target: `course-${courseData.id}`,
        animated: true,
        style: { stroke: "#6366f1" },
        markerEnd: { type: MarkerType.ArrowClosed },
      });
    });

    // Sibling topics (sides)
    const siblingTopics = relatedTopics.filter(t => t.relationship === "sibling");
    siblingTopics.forEach((topic, index) => {
      const nodeId = `topic-${topic.id}`;
      const xOffset = index % 2 === 0 ? -300 : 300;
      nodes.push({
        id: nodeId,
        type: "custom",
        position: { x: 400 + xOffset, y: 50 + Math.floor(index / 2) * 100 },
        data: {
          label: topic.topicName,
          relationship: "Sibling",
          isCurrent: false,
          isCompleted: false,
        },
      });
      edges.push({
        id: `edge-sibling-${topic.id}`,
        source: `course-${courseData.id}`,
        target: nodeId,
        style: { stroke: "#10b981", strokeDasharray: "5,5" },
      });
    });

    // Child topics (below)
    const childTopics = relatedTopics.filter(t => t.relationship === "child");
    childTopics.forEach((topic, index) => {
      const nodeId = `topic-${topic.id}`;
      nodes.push({
        id: nodeId,
        type: "custom",
        position: { x: 100 + index * 200, y: 200 },
        data: {
          label: topic.topicName,
          relationship: "Child",
          isCurrent: false,
          isCompleted: false,
        },
      });
      edges.push({
        id: `edge-child-${topic.id}`,
        source: `course-${courseData.id}`,
        target: nodeId,
        animated: true,
        style: { stroke: "#f59e0b" },
        markerEnd: { type: MarkerType.ArrowClosed },
      });
    });

    // Add chapter nodes
    courseData.chapters.forEach((chapter, index) => {
      const nodeId = `chapter-${chapter.id}`;
      nodes.push({
        id: nodeId,
        type: "custom",
        position: { x: 100 + index * 180, y: 350 },
        data: {
          label: chapter.title,
          isCurrent: false,
          isCompleted: false,
        },
      });
      edges.push({
        id: `edge-chapter-${chapter.id}`,
        source: `course-${courseData.id}`,
        target: nodeId,
        style: { stroke: "#94a3b8" },
      });
    });

    return { initialNodes: nodes, initialEdges: edges };
  }, [courseData]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Update nodes when data changes
  useMemo(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
  }, [initialNodes, initialEdges, setNodes, setEdges]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  // Get recommended topics based on selected path
  const getRecommendedTopics = useMemo(() => {
    if (!courseData?.relatedTopics || !selectedPath) return [];
    
    const topics = courseData.relatedTopics;
    
    switch (selectedPath) {
      case "foundational":
        return topics.filter(t => t.relationship === "parent");
      case "momentum":
        return topics.filter(t => t.relationship === "child").slice(0, 3);
      case "breadth":
        return topics.filter(t => t.relationship === "sibling");
      case "depth":
        return topics.filter(t => t.relationship === "child");
      default:
        return [];
    }
  }, [courseData?.relatedTopics, selectedPath]);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Brain className="w-8 h-8 text-primary" />
              Knowledge Graph
            </h1>
            <p className="text-muted-foreground">
              Visualize topic relationships and discover learning paths
            </p>
          </div>
          <Select
            value={selectedCourseId?.toString() || ""}
            onValueChange={(v) => setSelectedCourseId(v ? parseInt(v) : null)}
          >
            <SelectTrigger className="w-64">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {courses?.map(course => (
                <SelectItem key={course.id} value={course.id.toString()}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {coursesLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : !user ? (
          <div className="text-center py-24">
            <Brain className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Sign in to view knowledge graph</h2>
          </div>
        ) : !selectedCourseId ? (
          <div className="text-center py-24">
            <Map className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-xl font-semibold mb-2">Select a course</h2>
            <p className="text-muted-foreground">
              Choose a course to visualize its knowledge graph
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Graph */}
            <div className="lg:col-span-3">
              <Card className="overflow-hidden">
                <div style={{ height: 500 }}>
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onConnect={onConnect}
                    nodeTypes={nodeTypes}
                    fitView
                    attributionPosition="bottom-left"
                  >
                    <Background />
                    <Controls />
                    <MiniMap />
                  </ReactFlow>
                </div>
              </Card>

              {/* Legend */}
              <Card className="mt-4">
                <CardContent className="py-4">
                  <div className="flex flex-wrap items-center gap-6">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-sm">Current Course</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 bg-indigo-500" />
                      <span className="text-sm">Parent Topic</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 bg-green-500" style={{ borderStyle: "dashed" }} />
                      <span className="text-sm">Sibling Topic</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-0.5 bg-amber-500" />
                      <span className="text-sm">Child Topic</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Learning Paths */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Compass className="w-5 h-5" />
                    Learning Paths
                  </CardTitle>
                  <CardDescription>
                    Choose a path to guide your learning
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {learningPaths.map((path) => {
                    const Icon = path.icon;
                    const isSelected = selectedPath === path.id;
                    return (
                      <button
                        key={path.id}
                        onClick={() => setSelectedPath(isSelected ? null : path.id)}
                        className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "border-border hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg ${path.color} flex items-center justify-center`}>
                            <Icon className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <div className="font-medium text-sm">{path.name}</div>
                            <div className="text-xs text-muted-foreground">{path.description}</div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Recommended Topics */}
              {selectedPath && getRecommendedTopics.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Sparkles className="w-5 h-5" />
                      Recommended Next
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {getRecommendedTopics.map((topic) => (
                      <Link
                        key={topic.id}
                        href={user ? `/create?topic=${encodeURIComponent(topic.topicName)}` : "#"}
                      >
                        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 cursor-pointer group">
                          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Plus className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-sm truncate">{topic.topicName}</div>
                            <Badge variant="outline" className="text-xs capitalize">
                              {topic.relationship}
                            </Badge>
                          </div>
                          <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
                        </div>
                      </Link>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Course Stats */}
              {courseData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Course Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Chapters</span>
                      <span className="font-medium">{courseData.chapters.length}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Lessons</span>
                      <span className="font-medium">
                        {courseData.chapters.reduce((acc, ch) => acc + ch.lessons.length, 0)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Related Topics</span>
                      <span className="font-medium">{courseData.relatedTopics?.length || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Glossary Terms</span>
                      <span className="font-medium">{courseData.glossaryTerms?.length || 0}</span>
                    </div>
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
