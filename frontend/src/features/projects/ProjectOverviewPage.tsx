import { Link } from "react-router-dom";
import { FlaskConical, Globe2, Users } from "lucide-react";

import { formatRelativeTime } from "@/lib/format";
import { useProjectContext } from "@/features/projects/ProjectContext";

function MetricCard({ icon: Icon, label, value }: { icon: typeof FlaskConical; label: string; value: string | number }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-border-default bg-surface-raised px-4 py-3.5">
      <div className="flex size-8 items-center justify-center rounded-md bg-surface-sunken text-fg-muted">
        <Icon className="size-4" aria-hidden />
      </div>
      <div>
        <div className="text-[16px] font-semibold leading-none text-fg-primary">{value}</div>
        <div className="mt-1 text-[12px] text-fg-muted">{label}</div>
      </div>
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  admin: "Admin",
  qa_manager: "QA Manager",
  qa_engineer: "QA Engineer",
  viewer: "Viewer",
};

export function ProjectOverviewPage() {
  const project = useProjectContext();

  return (
    <div className="mx-auto max-w-4xl px-6 py-6">
      {project.description && (
        <p className="mb-6 max-w-2xl text-[13px] leading-relaxed text-fg-secondary">{project.description}</p>
      )}

      <div className="mb-8 grid grid-cols-3 gap-3">
        <MetricCard icon={FlaskConical} label="Test cases" value={project.test_case_count} />
        <MetricCard icon={Users} label="Miembros" value={project.members.length} />
        <MetricCard icon={Globe2} label="Última actividad" value={formatRelativeTime(project.last_activity_at)} />
      </div>

      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-fg-primary">Miembros del proyecto</h2>
      </div>
      <div className="flex flex-col divide-y divide-border-default rounded-lg border border-border-default bg-surface-raised">
        {project.members.map((member) => (
          <div key={member.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="text-[13px] font-medium text-fg-primary">{member.user.full_name}</div>
              <div className="text-[12px] text-fg-muted">{member.user.email}</div>
            </div>
            <span className="text-[12px] font-medium text-fg-secondary">{ROLE_LABELS[member.role]}</span>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Link
          to={`/projects/${project.id}/test-cases`}
          className="text-[13px] font-medium text-accent hover:text-accent-hover"
        >
          Ver todos los test cases →
        </Link>
      </div>
    </div>
  );
}
