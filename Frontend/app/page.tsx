async function getHealth() {
  const response = await fetch("http://127.0.0.1:8000/health", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Failed to connect to backend");
  }

  return response.json();
}

export default async function Home() {
  const health = await getHealth();

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">ResumeRadar</h1>

      <p className="mt-4">
        Backend status: {health.status}
      </p>
    </main>
  );
}