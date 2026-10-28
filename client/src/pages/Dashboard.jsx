import { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton, SkeletonCard, SkeletonActivity, SkeletonInsight } from "@/components/ui/skeleton";
import useDashboard from "../hooks/useDashboard";
import {
  User,
  Activity,
  FileText,
  MessageSquare,
  Settings,
  BarChart3,
  Calendar,
  TrendingUp,
  Shield,
  Bell,
  Clock,
  RefreshCw,
  Database,
  AlertCircle,
  CalendarDays,
  Stethoscope,
} from "lucide-react";
import { Link } from "react-router-dom";
import { formatActivityTime } from "../utils/activityTime";

const Dashboard = () => {
  const { currentUser } = useAuth();
  const { data, loading, error, refreshData } = useDashboard();
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [databaseStatus, setDatabaseStatus] = useState("checking");

  useEffect(() => {
    let active = true;
    const checkDatabase = async () => {
      try {
        const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5000";
        const response = await fetch(`${apiUrl}/health`, { cache: "no-store" });
        if (!response.ok) throw new Error("Health check failed");
        const health = await response.json();
        if (active) {
          setDatabaseStatus(
            health.database === "Connected" ? "connected" : "disconnected"
          );
        }
      } catch {
        if (active) setDatabaseStatus("unavailable");
      }
    };

    checkDatabase();
    const interval = setInterval(checkDatabase, 30000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshData();
      setLastRefresh(new Date());
    }, 60000); // 60 seconds

    return () => clearInterval(interval);
  }, [refreshData]);

  const handleRefresh = () => {
    refreshData();
    setLastRefresh(new Date());
  };

  const quickActions = [
    {
      title: "Upload Image",
      description: "Analyze new skin condition",
      icon: <FileText className="w-5 h-5 sm:w-6 sm:h-6" />,
      link: "/diagnose",
      color: "bg-blue-500",
    },
    {
      title: "View Reports",
      description: "Check your analysis history",
      icon: <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6" />,
      link: "/reports",
      color: "bg-green-500",
    },
    {
      title: "Ask Questions",
      description: "Get expert advice",
      icon: <MessageSquare className="w-5 h-5 sm:w-6 sm:h-6" />,
      link: "/qa",
      color: "bg-purple-500",
    },
    {
      title: "Document Analysis",
      description: "Analyze medical documents",
      icon: <FileText className="w-5 h-5 sm:w-6 sm:h-6" />,
      link: "/documents",
      color: "bg-orange-500",
    },
  ];

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">
            Access Denied
          </h1>
          <p className="text-sm sm:text-base text-gray-600 mb-6">
            Please log in to access your dashboard.
          </p>
          <Link to="/login">
            <Button className="bg-dermx-teal hover:bg-dermx-teal/90">
              Go to Login
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-3 sm:p-6 pb-20 md:pb-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Unable to Load Dashboard
              </h2>
              <p className="text-gray-600 mb-4">
                {error}
              </p>
              <Button onClick={handleRefresh} className="bg-dermx-teal hover:bg-dermx-teal/90">
                <RefreshCw className="w-4 h-4 mr-2" />
                Try Again
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-3 sm:p-6 pb-20 md:pb-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                Dashboard
              </h1>
              <p className="text-sm sm:text-base text-gray-600 mt-1">
                Welcome back, {currentUser.displayName || currentUser.email}
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-3">
              <div
                role="status"
                aria-live="polite"
                className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  databaseStatus === "connected"
                    ? "border-green-200 bg-green-50 text-green-800"
                    : databaseStatus === "checking"
                    ? "border-gray-200 bg-gray-50 text-gray-600"
                    : "border-red-200 bg-red-50 text-red-800"
                }`}
              >
                <Database className="h-4 w-4" />
                {databaseStatus === "connected"
                  ? "MongoDB Connected"
                  : databaseStatus === "checking"
                  ? "Checking database…"
                  : databaseStatus === "disconnected"
                  ? "MongoDB Disconnected"
                  : "Database status unavailable"}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={loading}
                className="text-gray-600 hover:text-gray-900"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <p className="text-xs text-gray-500">
                Last updated: {lastRefresh.toLocaleTimeString()}
              </p>
            </div>
          </div>
        </div>
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {loading ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : (
            <>
              <Card className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Total Diagnoses
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {data.stats.totalDiagnoses}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-100 rounded-lg">
                    <FileText className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Recent Reports
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {data.stats.recentReports}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-yellow-100 rounded-lg">
                    <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      Pending Analyses
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {data.stats.pendingAnalyses}
                    </p>
                  </div>
                </div>
              </Card>

              <Card className="p-4 sm:p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
                  </div>
                  <div className="ml-3 sm:ml-4">
                    <p className="text-xs sm:text-sm font-medium text-gray-600">
                      AI Confidence
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {data.stats.aiConfidence === null || data.stats.aiConfidence === undefined
                        ? '—'
                        : `${data.stats.aiConfidence}%`}
                    </p>
                  </div>
                </div>
              </Card>
            </>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
          {/* Quick Actions */}
          <div className="lg:col-span-2">
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                Quick Actions
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {quickActions.map((action, index) => (
                  <Link key={index} to={action.link}>
                    <Card className="p-3 sm:p-4 hover:shadow-md transition-shadow cursor-pointer border-2 border-transparent hover:border-dermx-teal/20">
                      <div className="flex items-center">
                        <div
                          className={`p-2 sm:p-3 rounded-lg ${action.color} text-white`}
                        >
                          {action.icon}
                        </div>
                        <div className="ml-3 sm:ml-4">
                          <h3 className="font-medium text-gray-900 text-sm sm:text-base">
                            {action.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600">
                            {action.description}
                          </p>
                        </div>
                      </div>
                    </Card>
                  </Link>
                ))}
              </div>
            </Card>
          </div>

          {/* Recent Activity */}
          <div>
            <Card className="p-4 sm:p-6">
              <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
                Recent Activity
              </h2>
              <div className="space-y-3 sm:space-y-4">
                {loading ? (
                  <>
                    <SkeletonActivity />
                    <SkeletonActivity />
                    <SkeletonActivity />
                  </>
                ) : data.activities.length > 0 ? (
                  data.activities.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start space-x-2 sm:space-x-3"
                    >
                      <div
                        className={`w-2 h-2 rounded-full mt-2 ${
                          activity.status === "completed"
                            ? "bg-green-500"
                            : "bg-yellow-500"
                        }`}
                      />
                      <div className="flex-1">
                        <p className="text-xs sm:text-sm font-medium text-gray-900">
                          {activity.title}
                        </p>
                        <p className="text-xs text-gray-600">
                          {activity.description}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {formatActivityTime(activity.timestamp)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No recent activity
                  </p>
                )}
              </div>
              <Link to="/activity" className="block">
                <Button variant="outline" className="w-full mt-4 text-sm">
                  View All Activity
                </Button>
              </Link>
            </Card>
          </div>
        </div>

        {/* Prototype care and history features */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-6 sm:mt-8">
          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-100"><CalendarDays className="w-6 h-6 text-blue-700" /></div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">Skin Health Timeline</h2>
                <p className="text-sm text-gray-600 mt-1">Review previous saved AI-assisted scans over time.</p>
                <Link to="/skin-timeline"><Button variant="outline" className="mt-4">View Timeline</Button></Link>
              </div>
            </div>
          </Card>
          <Card className="p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-teal-100"><Stethoscope className="w-6 h-6 text-teal-700" /></div>
              <div className="flex-1">
                <h2 className="text-lg font-semibold text-gray-900">Doctor Connect</h2>
                <p className="text-sm text-gray-600 mt-1">Explore demo dermatologist profiles and a prototype request flow.</p>
                <Link to="/doctor-connect"><Button variant="outline" className="mt-4">Consult a Dermatologist</Button></Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Health Insights */}
        <div className="mt-6 sm:mt-8">
          <Card className="p-4 sm:p-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6">
              Health Insights
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6">
              {loading ? (
                <>
                  <SkeletonInsight />
                  <SkeletonInsight />
                  <SkeletonInsight />
                </>
              ) : (
                <>
                  <div className="text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">
                      Analyses on Record
                    </h3>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">
                      {data.insights?.diagnosesOnRecord ?? 0}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      Saved diagnosis records
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <Calendar className="w-6 h-6 sm:w-8 sm:h-8 text-green-600" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">
                      Last Analysis
                    </h3>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">
                      {data.insights?.lastAnalysisAt
                        ? new Date(data.insights.lastAnalysisAt).toLocaleDateString()
                        : '—'}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {data.insights?.lastAnalysisAt ? 'From your saved history' : 'No analysis recorded'}
                    </p>
                  </div>

                  <div className="text-center">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                      <TrendingUp className="w-6 h-6 sm:w-8 sm:h-8 text-purple-600" />
                    </div>
                    <h3 className="font-medium text-gray-900 mb-2 text-sm sm:text-base">
                      Latest AI Confidence
                    </h3>
                    <p className="text-xl sm:text-2xl font-bold text-purple-600">
                      {data.insights?.latestConfidence ?? '—'}{data.insights?.latestConfidence !== null && data.insights?.latestConfidence !== undefined ? '%' : ''}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      {data.insights?.latestConfidence !== null && data.insights?.latestConfidence !== undefined
                        ? 'From the latest saved diagnosis'
                        : 'No confidence data available'}
                    </p>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
