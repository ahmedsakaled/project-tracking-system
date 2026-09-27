import { createFileRoute } from "@tanstack/react-router";
import { ProjectsPage } from "./_app.projects";

export const Route = createFileRoute("/_app/projects-completed")({
  component: () => <ProjectsPage defaultStatus="completed" />,
});
