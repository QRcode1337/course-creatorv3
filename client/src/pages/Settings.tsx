import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import Header from "@/components/Header";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import {
  Bot,
  Check,
  Eye,
  EyeOff,
  Key,
  Loader2,
  Save,
  Settings as SettingsIcon,
  Shield,
  Sparkles,
} from "lucide-react";

const aiProviders = [
  {
    id: "manus",
    name: "Manus (Built-in)",
    description: "Use the built-in AI service",
    requiresKey: false,
    models: [],
  },
  {
    id: "anthropic",
    name: "Anthropic Claude",
    description: "Claude 3.5 Sonnet, Claude 3 Opus",
    requiresKey: true,
    models: ["claude-3-5-sonnet-20241022", "claude-3-opus-20240229", "claude-3-sonnet-20240229"],
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4 Turbo",
    requiresKey: true,
    models: ["gpt-4o", "gpt-4-turbo", "gpt-4", "gpt-3.5-turbo"],
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    description: "Access multiple models via OpenRouter",
    requiresKey: true,
    models: ["anthropic/claude-3.5-sonnet", "openai/gpt-4o", "meta-llama/llama-3.1-405b-instruct"],
  },
  {
    id: "grok",
    name: "Grok (xAI)",
    description: "Grok-2 and Grok-2 Vision",
    requiresKey: true,
    models: ["grok-2", "grok-2-vision"],
  },
];

export default function Settings() {
  const { user, loading: authLoading } = useAuth();
  
  const [preferredProvider, setPreferredProvider] = useState("manus");
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [models, setModels] = useState<Record<string, string>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [hasChanges, setHasChanges] = useState(false);

  const { data: settings, isLoading } = trpc.settings.get.useQuery(undefined, {
    enabled: !!user,
  });

  const updateSettings = trpc.settings.update.useMutation({
    onSuccess: () => {
      toast.success("Settings saved successfully");
      setHasChanges(false);
    },
    onError: (error) => {
      toast.error(error.message || "Failed to save settings");
    },
  });

  // Load settings when data arrives
  useEffect(() => {
    if (settings) {
      setPreferredProvider(settings.preferredProvider || "manus");
      setApiKeys({
        anthropic: settings.anthropicApiKey || "",
        openai: settings.openaiApiKey || "",
        openrouter: settings.openrouterApiKey || "",
        grok: settings.grokApiKey || "",
      });
      setModels({
        anthropic: settings.anthropicModel || "claude-3-5-sonnet-20241022",
        openai: settings.openaiModel || "gpt-4o",
        openrouter: settings.openrouterModel || "anthropic/claude-3.5-sonnet",
        grok: settings.grokModel || "grok-2",
      });
    }
  }, [settings]);

  const handleSave = () => {
    updateSettings.mutate({
      preferredProvider: preferredProvider as any,
      anthropicApiKey: apiKeys.anthropic || undefined,
      anthropicModel: models.anthropic || undefined,
      openaiApiKey: apiKeys.openai || undefined,
      openaiModel: models.openai || undefined,
      openrouterApiKey: apiKeys.openrouter || undefined,
      openrouterModel: models.openrouter || undefined,
      grokApiKey: apiKeys.grok || undefined,
      grokModel: models.grok || undefined,
    });
  };

  const toggleShowKey = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider] }));
  };

  const handleProviderChange = (value: string) => {
    setPreferredProvider(value);
    setHasChanges(true);
  };

  const handleApiKeyChange = (provider: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
    setHasChanges(true);
  };

  const handleModelChange = (provider: string, value: string) => {
    setModels(prev => ({ ...prev, [provider]: value }));
    setHasChanges(true);
  };

  if (authLoading || isLoading) {
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
          <SettingsIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-4">Sign in to access settings</h1>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <main className="container py-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-3">
                <SettingsIcon className="w-8 h-8 text-primary" />
                Settings
              </h1>
              <p className="text-muted-foreground">
                Configure your AI providers and preferences
              </p>
            </div>
            {hasChanges && (
              <Button onClick={handleSave} disabled={updateSettings.isPending} className="gap-2">
                {updateSettings.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Save Changes
              </Button>
            )}
          </div>

          <Tabs defaultValue="ai" className="space-y-6">
            <TabsList>
              <TabsTrigger value="ai" className="gap-2">
                <Bot className="w-4 h-4" />
                AI Providers
              </TabsTrigger>
              <TabsTrigger value="account" className="gap-2">
                <Shield className="w-4 h-4" />
                Account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="ai" className="space-y-6">
              {/* Preferred Provider */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Preferred AI Provider
                  </CardTitle>
                  <CardDescription>
                    Choose which AI service to use for course generation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Select value={preferredProvider} onValueChange={handleProviderChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {aiProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          <div className="flex items-center gap-2">
                            <span>{provider.name}</span>
                            {provider.id === "manus" && (
                              <Badge variant="secondary" className="text-xs">Default</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-sm text-muted-foreground mt-2">
                    {aiProviders.find(p => p.id === preferredProvider)?.description}
                  </p>
                </CardContent>
              </Card>

              {/* API Keys */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="w-5 h-5" />
                    API Keys
                  </CardTitle>
                  <CardDescription>
                    Configure API keys for external AI providers. Keys are encrypted and stored securely.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {aiProviders.filter(p => p.requiresKey).map((provider) => (
                    <div key={provider.id} className="space-y-4 pb-6 border-b last:border-0 last:pb-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">{provider.name}</h4>
                          <p className="text-sm text-muted-foreground">{provider.description}</p>
                        </div>
                        {apiKeys[provider.id] && (
                          <Badge variant="outline" className="gap-1 text-green-600">
                            <Check className="w-3 h-3" />
                            Configured
                          </Badge>
                        )}
                      </div>
                      
                      <div className="grid gap-4">
                        <div className="space-y-2">
                          <Label>API Key</Label>
                          <div className="relative">
                            <Input
                              type={showKeys[provider.id] ? "text" : "password"}
                              placeholder={`Enter your ${provider.name} API key`}
                              value={apiKeys[provider.id] || ""}
                              onChange={(e) => handleApiKeyChange(provider.id, e.target.value)}
                              className="pr-10"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="absolute right-0 top-0 h-full px-3"
                              onClick={() => toggleShowKey(provider.id)}
                            >
                              {showKeys[provider.id] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label>Model</Label>
                          <Select
                            value={models[provider.id] || provider.models[0]}
                            onValueChange={(v) => handleModelChange(provider.id, v)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {provider.models.map((model) => (
                                <SelectItem key={model} value={model}>
                                  {model}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="account" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Account Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">Name</p>
                      <p className="text-sm text-muted-foreground">{user.name || "Not set"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3 border-b">
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">{user.email || "Not set"}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">Role</p>
                      <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
                    </div>
                    <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                      {user.role}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Data & Privacy</CardTitle>
                  <CardDescription>
                    Manage your data and privacy settings
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between py-3">
                    <div>
                      <p className="font-medium">Export Data</p>
                      <p className="text-sm text-muted-foreground">
                        Download all your courses and progress data
                      </p>
                    </div>
                    <Button variant="outline" disabled>
                      Coming Soon
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
}
