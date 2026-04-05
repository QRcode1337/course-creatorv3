import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export function Analytics() {
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d">("30d");
  const [selectedTier, setSelectedTier] = useState<"guest" | "authenticated" | "premium" | undefined>(undefined);

  // Fetch analytics data
  const { data: statsData, isLoading: statsLoading } = trpc.analytics.stats.useQuery({
    startDate: new Date(Date.now() - (dateRange === "7d" ? 7 : dateRange === "30d" ? 30 : 90) * 24 * 60 * 60 * 1000),
    userTier: selectedTier,
  });

  const { data: conversionData, isLoading: conversionLoading } = trpc.analytics.conversion.useQuery();

  const COLORS = ["#3b82f6", "#ef4444", "#10b981"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-slate-900 mb-2">Analytics Dashboard</h1>
          <p className="text-slate-600">Track course preview generation and signup conversion</p>
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-8 flex-wrap">
          <div className="flex gap-2">
            <Button
              variant={dateRange === "7d" ? "default" : "outline"}
              onClick={() => setDateRange("7d")}
              size="sm"
            >
              Last 7 days
            </Button>
            <Button
              variant={dateRange === "30d" ? "default" : "outline"}
              onClick={() => setDateRange("30d")}
              size="sm"
            >
              Last 30 days
            </Button>
            <Button
              variant={dateRange === "90d" ? "default" : "outline"}
              onClick={() => setDateRange("90d")}
              size="sm"
            >
              Last 90 days
            </Button>
          </div>

          <div className="flex gap-2">
            <Button
              variant={selectedTier === undefined ? "default" : "outline"}
              onClick={() => setSelectedTier(undefined)}
              size="sm"
            >
              All Tiers
            </Button>
            <Button
              variant={selectedTier === "guest" ? "default" : "outline"}
              onClick={() => setSelectedTier("guest")}
              size="sm"
            >
              Guests
            </Button>
            <Button
              variant={selectedTier === "authenticated" ? "default" : "outline"}
              onClick={() => setSelectedTier("authenticated")}
              size="sm"
            >
              Authenticated
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Total Previews</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900">
                {statsLoading ? "..." : statsData?.totalEvents || 0}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Success Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-600">
                {statsLoading
                  ? "..."
                  : statsData?.successStats
                  ? Math.round(
                      ((statsData.successStats.find((s) => s.success)?.count || 0) /
                        (statsData.totalEvents || 1)) *
                        100
                    ) + "%"
                  : "0%"}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Guest Conversion</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-blue-600">
                {conversionLoading ? "..." : conversionData?.conversionRate.toFixed(1) || "0"}%
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {conversionData?.convertedGuests || 0} of {conversionData?.totalGuests || 0} guests
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-slate-600">Avg Previews Before Signup</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-purple-600">
                {conversionLoading ? "..." : conversionData?.avgPreviewsBeforeSignup.toFixed(1) || "0"}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* By Tier Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Previews by Tier</CardTitle>
              <CardDescription>Distribution of preview attempts across user tiers</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-64 flex items-center justify-center text-slate-500">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statsData?.byTier || []}
                      dataKey="count"
                      nameKey="tier"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label
                    >
                      {(statsData?.byTier || []).map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Top Topics Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Topics</CardTitle>
              <CardDescription>Most popular course topics in previews</CardDescription>
            </CardHeader>
            <CardContent>
              {statsLoading ? (
                <div className="h-64 flex items-center justify-center text-slate-500">Loading...</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={statsData?.topTopics || []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="topic" angle={-45} textAnchor="end" height={100} interval={0} tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3b82f6" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Success vs Failure */}
        <Card>
          <CardHeader>
            <CardTitle>Success vs Failure</CardTitle>
            <CardDescription>Preview generation outcomes</CardDescription>
          </CardHeader>
          <CardContent>
            {statsLoading ? (
              <div className="h-64 flex items-center justify-center text-slate-500">Loading...</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={statsData?.successStats || []}
                        dataKey="count"
                        nameKey="success"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        label={({ success, count }) => `${success ? "Success" : "Failed"}: ${count}`}
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col justify-center gap-4">
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Successful Previews</p>
                    <p className="text-2xl font-bold text-green-600">
                      {statsData?.successStats?.find((s) => s.success)?.count || 0}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-slate-600 mb-1">Failed Previews</p>
                    <p className="text-2xl font-bold text-red-600">
                      {statsData?.successStats?.find((s) => !s.success)?.count || 0}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
