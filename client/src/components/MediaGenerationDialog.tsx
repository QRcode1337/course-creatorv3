import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, Image, BarChart3, FileImage, Palette, Sparkles, LineChart } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MediaGenerationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonTitle: string;
  lessonContent: string;
  onGenerate: (customPrompt: string) => Promise<void>;
  isGenerating: boolean;
}

type MediaType = "illustration" | "infographic" | "data_viz" | "diagram";
type VisualStyle = "minimalist" | "detailed" | "colorful" | "technical" | "modern";

export function MediaGenerationDialog({
  open,
  onOpenChange,
  lessonTitle,
  lessonContent,
  onGenerate,
  isGenerating,
}: MediaGenerationDialogProps) {
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedType, setSelectedType] = useState<MediaType>("illustration");
  const [selectedStyle, setSelectedStyle] = useState<VisualStyle>("modern");

  const mediaTypes = [
    {
      id: "illustration" as const,
      label: "Illustration",
      icon: Image,
      description: "Visual representation of concepts",
    },
    {
      id: "infographic" as const,
      label: "Infographic",
      icon: BarChart3,
      description: "Information design with icons & text",
    },
    {
      id: "data_viz" as const,
      label: "Data Visualization",
      icon: LineChart,
      description: "Charts, graphs, and data displays",
    },
    {
      id: "diagram" as const,
      label: "Diagram",
      icon: FileImage,
      description: "Technical diagrams and flowcharts",
    },
  ];

  const visualStyles = [
    {
      id: "minimalist" as const,
      label: "Minimalist",
      description: "Clean, simple, with lots of white space",
      prompt: "minimalist design, clean lines, simple shapes, limited color palette, lots of white space",
    },
    {
      id: "detailed" as const,
      label: "Detailed",
      description: "Rich in detail and visual complexity",
      prompt: "highly detailed, intricate, rich textures, complex visual elements, comprehensive",
    },
    {
      id: "colorful" as const,
      label: "Colorful",
      description: "Vibrant colors and bold contrasts",
      prompt: "vibrant colors, bold color palette, high contrast, eye-catching, colorful and energetic",
    },
    {
      id: "technical" as const,
      label: "Technical",
      description: "Precise, blueprint-style, professional",
      prompt: "technical drawing style, precise lines, blueprint aesthetic, professional, engineering-style",
    },
    {
      id: "modern" as const,
      label: "Modern",
      description: "Contemporary flat design aesthetic",
      prompt: "modern flat design, contemporary style, clean gradients, trendy aesthetic",
    },
  ];

  const handleGenerate = async () => {
    await onGenerate(customPrompt || getDefaultPrompt());
    setCustomPrompt("");
  };

  const getDefaultPrompt = () => {
    const styleModifier = visualStyles.find(s => s.id === selectedStyle)?.prompt || "";
    
    const typePrompts: Record<MediaType, string> = {
      illustration: `Create a detailed educational illustration for the lesson "${lessonTitle}". The image should visually represent the key concepts discussed in the lesson. Style: ${styleModifier}`,
      infographic: `Create an infographic that summarizes the main points from the lesson "${lessonTitle}". Include visual elements like charts, icons, and text labels to make the information easy to understand. Style: ${styleModifier}`,
      data_viz: `Create a data visualization or chart for the lesson "${lessonTitle}". Display information, statistics, or relationships in a clear, visual format using graphs, charts, or diagrams. Style: ${styleModifier}`,
      diagram: `Create a technical diagram for the lesson "${lessonTitle}". Show the relationships, processes, or structures discussed in the lesson with clear labels and connections. Style: ${styleModifier}`,
    };
    
    return typePrompts[selectedType];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] bg-background border-2 shadow-2xl">
        <DialogHeader>
          <DialogTitle>Generate Media for Lesson</DialogTitle>
          <DialogDescription>
            Create visual content based on "{lessonTitle}". Choose media type, visual style, and optionally customize the prompt.
          </DialogDescription>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Media Type Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold">Media Type</Label>
              <div className="grid grid-cols-2 gap-2">
                {mediaTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <button
                      key={type.id}
                      onClick={() => setSelectedType(type.id)}
                      className={`p-3 border-2 rounded-lg text-left transition-all ${
                        selectedType === type.id
                          ? "border-primary bg-primary/10 shadow-sm"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      <Icon className="w-5 h-5 mb-2" />
                      <div className="font-medium text-sm">{type.label}</div>
                      <div className="text-xs text-muted-foreground mt-1">{type.description}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Visual Style Selection */}
            <div className="space-y-3">
              <Label className="text-base font-semibold flex items-center gap-2">
                <Palette className="w-4 h-4" />
                Visual Style
              </Label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {visualStyles.map((style) => (
                  <button
                    key={style.id}
                    onClick={() => setSelectedStyle(style.id)}
                    className={`p-3 border-2 rounded-lg text-left transition-all ${
                      selectedStyle === style.id
                        ? "border-primary bg-primary/10 shadow-sm"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <div className="font-medium text-sm">{style.label}</div>
                    <div className="text-xs text-muted-foreground mt-1">{style.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Prompt */}
            <div className="space-y-2">
              <Label htmlFor="custom-prompt" className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Custom Prompt (Optional)
              </Label>
              <Textarea
                id="custom-prompt"
                placeholder="Add specific details or override the default prompt..."
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                rows={3}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                Leave empty to use AI-generated prompt based on your selections
              </p>
            </div>

            {/* Preview of what will be generated */}
            <div className="p-4 bg-muted rounded-lg text-sm border">
              <div className="font-medium mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                Generation Prompt:
              </div>
              <div className="text-muted-foreground leading-relaxed">
                {customPrompt || getDefaultPrompt()}
              </div>
            </div>
          </div>
        </ScrollArea>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isGenerating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="gap-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Image className="w-4 h-4" />
                Generate Media
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
