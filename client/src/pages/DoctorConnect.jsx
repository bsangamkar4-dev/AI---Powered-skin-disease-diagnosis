import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowLeft, CalendarDays, Clock3, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

const demoDoctors = [
  {
    id: "demo-dermatologist-1",
    name: "Demo Dermatologist 1",
    image: "/demo-dermatologist-1.png",
    specialty: "Dermatology",
    experience: "Demo profile; no real credentials represented",
    consultationType: "Prototype video request (no video call is provided)",
    slots: ["10:00 AM", "11:30 AM", "2:00 PM"],
  },
  {
    id: "demo-dermatologist-2",
    name: "Demo Dermatologist 2",
    image: "/demo-dermatologist-2.png",
    specialty: "Dermatology",
    experience: "Demo profile; no real credentials represented",
    consultationType: "Prototype in-person request (no appointment is booked)",
    slots: ["9:30 AM", "1:00 PM", "3:30 PM"],
  },
];

const localDateString = () => {
  const now = new Date();
  const localOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - localOffset).toISOString().slice(0, 10);
};

const DoctorConnect = () => {
  const location = useLocation();
  const recentAnalysis = location.state?.analysis;
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const openProfile = (doctor) => {
    setSelectedDoctor(doctor);
    setDate("");
    setTime("");
    setSubmitted(false);
  };

  const submitRequest = (event) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <main className="min-h-screen bg-gray-50 p-4 sm:p-6 pb-20 md:pb-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <Link to="/dashboard">
          <Button variant="outline">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Dashboard
          </Button>
        </Link>

        <section>
          <div className="flex items-center gap-3 mb-2">
            <Stethoscope className="w-7 h-7 text-teal-700" />
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Doctor Connect</h1>
          </div>
          <p className="text-gray-600 max-w-3xl">
            Explore demo profiles and submit a local prototype request. This does not contact a doctor or book an appointment.
          </p>
        </section>

        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <strong>Medical disclaimer:</strong> AI results are preliminary and are not a medical diagnosis. Consult a qualified healthcare professional for medical advice.
        </div>

        {recentAnalysis?.condition && (
          <Card className="p-4 border-teal-100">
            <p className="font-medium text-gray-900">Based on your recent AI-assisted analysis</p>
            <p className="text-sm text-gray-600 mt-1">
              Possible condition: {recentAnalysis.condition}
              {recentAnalysis.confidence !== undefined && ` · Confidence: ${recentAnalysis.confidence}%`}
            </p>
            <p className="text-xs text-gray-500 mt-1">This is a preliminary AI result, not a confirmed diagnosis.</p>
          </Card>
        )}

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {demoDoctors.map((doctor) => (
            <Card key={doctor.id} className="p-5 sm:p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs uppercase tracking-wide font-semibold text-teal-700">Demo profile</p>
                  <h2 className="text-lg font-semibold text-gray-900 mt-1">{doctor.name}</h2>
                  <p className="text-sm text-gray-600">Specialty: {doctor.specialty}</p>
                </div>
                <img
                  src={doctor.image}
                  alt={`${doctor.name} demo portrait`}
                  loading="lazy"
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-2 border-teal-100 shrink-0"
                />
              </div>
              <dl className="space-y-3 mt-5 text-sm">
                <div><dt className="font-medium text-gray-800">Experience</dt><dd className="text-gray-600">{doctor.experience}</dd></div>
                <div><dt className="font-medium text-gray-800">Consultation type</dt><dd className="text-gray-600">{doctor.consultationType}</dd></div>
                <div>
                  <dt className="font-medium text-gray-800">Available demo slots</dt>
                  <dd className="text-gray-600">{doctor.slots.join(" · ")}</dd>
                </div>
              </dl>
              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Button variant="outline" className="flex-1" onClick={() => openProfile(doctor)}>View Profile</Button>
                <Button className="flex-1 bg-teal-700 hover:bg-teal-800" onClick={() => openProfile(doctor)}>Request Consultation</Button>
              </div>
            </Card>
          ))}
        </section>

        {selectedDoctor && (
          <Card className="p-5 sm:p-6">
            <h2 className="text-xl font-semibold text-gray-900">Request with {selectedDoctor.name}</h2>
            <p className="text-sm text-gray-600 mt-1">Demo profile only · Your request details stay in this page and are not sent or saved.</p>
            {submitted ? (
              <div role="status" className="mt-5 rounded-lg border border-green-200 bg-green-50 p-4 text-green-900">
                <p className="font-semibold">Consultation request submitted for prototype/demo purposes.</p>
                <p className="text-sm mt-1">No appointment was booked and no doctor was contacted.</p>
                <p className="text-sm mt-2">{selectedDoctor.name} · {date} · {time}</p>
              </div>
            ) : (
              <form onSubmit={submitRequest} className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-5">
                <label className="text-sm font-medium text-gray-700">
                  Choose date
                  <span className="relative block mt-1"><CalendarDays className="absolute left-3 top-3 w-4 h-4 text-gray-500" /><input required type="date" min={localDateString()} value={date} onChange={(event) => setDate(event.target.value)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pl-9" /></span>
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Choose demo time
                  <span className="relative block mt-1"><Clock3 className="absolute left-3 top-3 w-4 h-4 text-gray-500" /><select required value={time} onChange={(event) => setTime(event.target.value)} className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 pl-9"><option value="">Select a time</option>{selectedDoctor.slots.map((slot) => <option value={slot} key={slot}>{slot}</option>)}</select></span>
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Your name
                  <input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2" />
                </label>
                <label className="text-sm font-medium text-gray-700">
                  Email address
                  <input required type="email" maxLength={254} value={email} onChange={(event) => setEmail(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2" />
                </label>
                <label className="sm:col-span-2 text-sm font-medium text-gray-700">
                  Request details (optional)
                  <textarea maxLength={500} rows={3} value={details} onChange={(event) => setDetails(event.target.value)} className="mt-1 w-full rounded-md border border-gray-300 bg-white px-3 py-2" placeholder="Share a brief note for this demo request" />
                </label>
                <div className="sm:col-span-2 flex flex-col sm:flex-row gap-3">
                  <Button type="submit" className="bg-teal-700 hover:bg-teal-800">Request Consultation</Button>
                  <Button type="button" variant="outline" onClick={() => setSelectedDoctor(null)}>Cancel</Button>
                </div>
              </form>
            )}
          </Card>
        )}
      </div>
    </main>
  );
};

export default DoctorConnect;
