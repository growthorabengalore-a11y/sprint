import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api';
import ClientForm from '../components/admin/ClientForm';

export default function ClientIntake() {
  const { token = '' } = useParams();
  const [submitted, setSubmitted] = useState(false);

  if (submitted) return <div className="min-h-screen bg-crimson-50 p-4"><div className="card mx-auto mt-12 max-w-xl p-6 text-center"><h1 className="text-xl font-bold">Thank you</h1><p className="mt-2 text-slate-600">Your client information has been submitted.</p></div></div>;

  return (
    <main className="min-h-screen bg-crimson-50 p-4 sm:p-8">
      <div className="card mx-auto max-w-3xl p-4 sm:p-7">
        <div className="mb-5"><div className="text-sm font-semibold text-crimson-700">Growthora</div><h1 className="text-2xl font-bold">Client creation form</h1><p className="mt-1 text-sm text-slate-500">Enter your details below. You may attach one image or PDF.</p></div>
        <ClientForm
          submitLabel="Submit client details"
          onSubmit={async (body) => { await api.post(`/clients/public/${encodeURIComponent(token)}`, body); }}
          onSaved={() => setSubmitted(true)}
        />
      </div>
    </main>
  );
}
