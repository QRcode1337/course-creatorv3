import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import CreateCourse from "./pages/CreateCourse";
import CourseView from "./pages/CourseView";
import LessonView from "./pages/LessonView";
import Library from "./pages/Library";
import Flashcards from "./pages/Flashcards";
import KnowledgeGraph from "./pages/KnowledgeGraph";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import ImportDocument from "./pages/ImportDocument";
import PreviewCourse from "./pages/PreviewCourse";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create" component={CreateCourse} />
      <Route path="/course/:id" component={CourseView} />
      <Route path="/lesson/:id" component={LessonView} />
      <Route path="/library" component={Library} />
      <Route path="/flashcards" component={Flashcards} />
      <Route path="/knowledge-graph" component={KnowledgeGraph} />
      <Route path="/calendar" component={Calendar} />
      <Route path="/settings" component={Settings} />
      <Route path="/import" component={ImportDocument} />
      <Route path="/preview" component={PreviewCourse} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
