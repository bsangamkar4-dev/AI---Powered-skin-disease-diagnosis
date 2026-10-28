import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, CalendarDays, FileText, Images } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "../contexts/AuthContext";

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "Date unavailable"
    : date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
};

const SkinTimeline = () => {
  const { getIdToken, currentUser } = useAuth();
  const getIdTokenRef = useRef(getIdToken);
  getIdTokenRef.current = getIdToken;
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    const loadTimeline = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getIdTokenRef.current();
        if (!token) throw new Error("Authentication token unavailable. Please sign in again.");
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reports`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Request failed with status ${response.status}`);
        }
        const reportData = await response.json();
        if (active) {
          const history = Array.isArray(reportData.reports) ? reportData.reports : [];
          history.sort((a, b) => new Date(b.generatedAt) - new Date(a.generatedAt));
          setReports(history);
        }
      } catch (loadError) {
        if (active) setError(`Unable to load your scan history: ${loadError.message || "Please try again."}`);
      } finally {
        if (active) setLoading(false);
      }
    };

    loadTimeline();
    return () => { active = false; };
  }, [currentUser?.uid]);

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6 pb-20 md:pb-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link to="/dashboard">
          <Button variant="outline"><ArrowLeft className="w-4 h-4 mr-2" />Back to Dashboard</Button>
        </Link>
        <section>
          <div className="flex items-center gap-3 mb-2">
            <CalendarDays className="w-7 h-7 text-teal-700" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Skin Health Timeline</h1>
          </div>
          <p className="text-gray-600">A history of your saved AI-assisted skin scans. This timeline does not assess medical improvement or worsening.</p>
        </section>

        {loading ? (
          <Card className="p-6 text-sm text-gray-600">Loading your scan history…</Card>
        ) : error ? (
          <Card className="p-6" role="alert">
            <p className="text-red-700">{error}</p>
            <Button variant="outline" className="mt-4" onClick={() => window.location.reload()}>Try Again</Button>
          </Card>
        ) : reports.length === 0 ? (
          <Card className="p-8 text-center">
            <Images className="w-10 h-10 text-gray-400 mx-auto mb-3" />
            <p className="font-medium text-gray-900">No previous scans available. Complete your first skin analysis to start your timeline.</p>
            <Link to="/diagnose"><Button className="mt-5 bg-teal-700 hover:bg-teal-800">Start an Analysis</Button></Link>
          </Card>
        ) : (
          <section aria-label="Previous skin scans" className="space-y-4">
            {reports.map((report, index) => {
              return (
                <Card key={report.id || `${report.generatedAt}-${index}`} className="p-4 sm:p-6">
                  <div className="flex gap-4">
                    <div className="hidden sm:flex flex-col items-center" aria-hidden="true">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100 text-sm font-semibold text-teal-800">{reports.length - index}</span>
                      {index < reports.length - 1 && <span className="mt-2 w-px flex-1 bg-teal-200" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium uppercase tracking-wide text-teal-700">Scan {reports.length - index}{index === 0 ? " · Latest" : ""}</p>
                      <p className="text-sm text-gray-500 mt-1">{formatDate(report.generatedAt)}</p>
                      <h2 className="text-lg font-semibold text-gray-900 mt-2">{report.condition || "Analysis result unavailable"}</h2>
                      {report.confidence !== undefined && report.confidence !== null && (
                        <p className="text-sm text-gray-700 mt-1">Confidence: {report.confidence}%</p>
                      )}
                      <div className="flex flex-col items-start gap-2 text-sm mt-4">
                        <p className="flex items-center gap-2 text-gray-700"><FileText className="w-4 h-4" />Report: {report.downloadAvailable ? "Available" : "Not available"}</p>
                        {report.downloadAvailable && <Link to="/reports" className="text-teal-700 underline underline-offset-2">View Report</Link>}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </section>
        )}
      </div>
    </main>
  );
};

export default SkinTimeline;
