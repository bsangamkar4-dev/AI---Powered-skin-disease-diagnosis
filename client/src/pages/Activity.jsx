import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Activity as ActivityIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useAuth } from "../contexts/AuthContext";
import { formatActivityTime } from "../utils/activityTime";

const Activity = () => {
  const { currentUser, getIdToken } = useAuth();
  const getIdTokenRef = useRef(getIdToken);
  getIdTokenRef.current = getIdToken;
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let active = true;

    const loadActivities = async () => {
      setLoading(true);
      setError(null);
      try {
        const token = await getIdTokenRef.current();
        if (!token) throw new Error("Authentication token unavailable. Please sign in again.");

        const response = await fetch("/api/dashboard/recent-activities?limit=100", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Request failed with status ${response.status}`);
        }

        const data = await response.json();
        if (active) setActivities(Array.isArray(data.activities) ? data.activities : []);
      } catch (loadError) {
        if (active) setError(loadError.message || "Unable to load activity.");
      } finally {
        if (active) setLoading(false);
      }
    };

    loadActivities();
    return () => { active = false; };
  }, [currentUser?.uid, reloadKey]);

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6 pb-20 md:pb-6">
      <div className="max-w-4xl mx-auto">
        <Link to="/dashboard">
          <Button variant="outline" className="mb-5">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <Card className="p-5 sm:p-7">
          <div className="flex items-center gap-3 mb-6">
            <ActivityIcon className="w-6 h-6 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">All Activity</h1>
          </div>
          {loading ? (
            <p className="text-sm text-gray-600">Loading activity…</p>
          ) : error ? (
            <div role="alert">
              <p className="text-sm text-red-600">Unable to load activity: {error}</p>
              <Button variant="outline" className="mt-4" onClick={() => setReloadKey((key) => key + 1)}>Try Again</Button>
            </div>
          ) : activities.length ? (
            <div className="divide-y">
              {activities.map((item) => (
                <article key={item.id} className="py-4 first:pt-0 last:pb-0">
                  <p className="font-medium text-gray-900">{item.title}</p>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  <p className="text-xs text-gray-500 mt-2">{formatActivityTime(item.timestamp)}</p>
                </article>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-600">No activity records are available.</p>
          )}
        </Card>
      </div>
    </main>
  );
};

export default Activity;
