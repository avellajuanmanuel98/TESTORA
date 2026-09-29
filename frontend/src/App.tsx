import { Navigate, Route, Routes } from "react-router-dom";

import { AppLayout } from "@/components/layout/AppLayout";
import { LoginPage } from "@/features/auth/LoginPage";
import { RequireAuth } from "@/features/auth/RequireAuth";
import { DashboardPage } from "@/features/dashboard/DashboardPage";
import { EnvironmentsPage } from "@/features/environments/EnvironmentsPage";
import { ProjectOverviewPage } from "@/features/projects/ProjectOverviewPage";
import { ProjectSettingsPage } from "@/features/projects/ProjectSettingsPage";
import { ProjectWorkspaceLayout } from "@/features/projects/ProjectWorkspaceLayout";
import { ProjectsListPage } from "@/features/projects/ProjectsListPage";
import { ReportsPage } from "@/features/reports/ReportsPage";
import { TestCaseBuilderPage } from "@/features/test-cases/TestCaseBuilderPage";
import { TestCasesListPage } from "@/features/test-cases/TestCasesListPage";
import { TestRunDetailPage } from "@/features/test-runs/TestRunDetailPage";
import { TestRunsListPage } from "@/features/test-runs/TestRunsListPage";
import { TestSuiteDetailPage } from "@/features/test-suites/TestSuiteDetailPage";
import { TestSuitesListPage } from "@/features/test-suites/TestSuitesListPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="projects" element={<ProjectsListPage />} />
        <Route path="projects/:projectId" element={<ProjectWorkspaceLayout />}>
          <Route index element={<ProjectOverviewPage />} />
          <Route path="test-cases" element={<TestCasesListPage />} />
          <Route path="test-cases/:testCaseId" element={<TestCaseBuilderPage />} />
          <Route path="test-suites" element={<TestSuitesListPage />} />
          <Route path="test-suites/:suiteId" element={<TestSuiteDetailPage />} />
          <Route path="test-runs" element={<TestRunsListPage />} />
          <Route path="test-runs/:runId" element={<TestRunDetailPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="environments" element={<EnvironmentsPage />} />
          <Route path="settings" element={<ProjectSettingsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
