import Link from "next/link";
import { SearchForm } from "@/components/search-form";
import { getRecentAssessments } from "@/lib/data";

export default async function Home() {
  const recentAssessments = await getRecentAssessments(10);

  return (
    <div>
      <h1>Deppulse</h1>
      <p>
        Quickly assess whether an open-source project is actively maintained.
      </p>

      <SearchForm />

      {recentAssessments.length > 0 && (
        <div>
          <h2>Recent Analyses</h2>
          <ul>
            {recentAssessments.map((assessment) => (
              <li key={assessment.id}>
                <Link href={`/repo/${assessment.owner}/${assessment.repo}`}>
                  {assessment.fullName} - {assessment.riskCategory}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
